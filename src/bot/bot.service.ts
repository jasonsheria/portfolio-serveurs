import { Injectable } from '@nestjs/common';
import { MessagesService } from 'src/messages/messages.service';
import { UsersService } from 'src/users/users.service';
import { ChatGroq } from "@langchain/groq";
// Note: some langchain submodules (PDF loader, HF embeddings) are not exported by the installed
// `langchain` package version in this project. To keep the build stable we use `pdf-parse` to
// extract text from PDFs and the built-in fake embeddings for vector creation. Replace these
// with the preferred implementations (e.g. a proper LangChain PDFLoader and HuggingFace
// embeddings) once the matching packages/versions are available.
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"; // Pour découper le texte
import { MemoryVectorStore } from "langchain/vectorstores/memory"; // Base vectorielle en mémoire (simple pour démo)
import { createStuffDocumentsChain } from "langchain/chains/combine_documents"; // Chaîne pour combiner docs et prompt
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval"; // Chaîne RAG complète
import 'dotenv/config'; // Pour charger les variables d'environnement depuis .env
import { FakeEmbeddings } from "langchain/embeddings/fake";
import { Document } from "@langchain/core/documents"; // Import Document type
import fs from 'fs/promises';
import pdf from 'pdf-parse';

// --- Configuration ---
const pdfPath = "./src/bot/model/musalaprojet.pdf"; // IMPORTANT: Mettez le chemin vers VOTRE PDF
const groqApiKey = process.env.GROQ_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY; // Although not used in this snippet, keep for completeness if needed elsewhere
const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;

// --- API Key Validation ---
if (!groqApiKey) {
    throw new Error("La clé API GROQ_API_KEY doit être définie dans le fichier .env");
}
if (!huggingfaceApiKey) {
     throw new Error("La clé API HUGGINGFACE_API_KEY doit être définie dans le fichier .env");
}

@Injectable()
export class BotService {
    private groq: ChatGroq;
    private vectorStore: MemoryVectorStore | undefined; // Make vectorStore potentially undefined
    private retriever: any; // Consider a more specific type if possible
    private responseCache: Map<string, string> = new Map();
    private isVectorStoreInitialized = false; // Flag to track initialization status
    private initPromise: Promise<void> | null = null;

    constructor(
        private userService: UsersService,
        private messageService: MessagesService
    ) {
        // Initialize the Groq model
        this.groq = new ChatGroq({
            apiKey: groqApiKey,
            model: "llama3-8b-8192", // Using a common Llama3 model available on Groq
            temperature: 0.1,
        });

        // Asynchronously initialize the vector store and keep the promise so we can await later
        this.initPromise = this.initVectorStore().catch(error => {
            console.error("Failed to initialize vector store:", error);
            // Keep isVectorStoreInitialized = false so predilect knows it's not ready
        });
    }

    /**
     * Initializes the vector store by loading and processing the PDF document.
     * Includes error handling for the loading and embedding process.
     */
    private async initVectorStore() {
        console.log("Starting vector store initialization...");
        try {
            // Load the PDF document using pdf-parse and wrap into LangChain Document(s)
            console.log(`Loading PDF from: ${pdfPath}`);
            const fileBuffer = await fs.readFile(pdfPath);
            const parsed = await pdf(fileBuffer as Buffer);
            const text = (parsed && (parsed as any).text) ? (parsed as any).text : '';
            const docs: Document[] = [];
            if (text && text.length > 0) {
                docs.push({ pageContent: text, metadata: { source: pdfPath } } as Document);
            }

            if (!docs || docs.length === 0) {
                console.error("Erreur: Impossible de charger le document PDF ou le document est vide.");
                // Set initialization flag to false if loading fails
                this.isVectorStoreInitialized = false;
                return; // Exit initialization if no documents are loaded
            }
            console.log(`Successfully loaded ${docs.length} document(s) from PDF.`);

            // Split the documents into smaller chunks
            console.log("Splitting documents...");
            const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
            const splitDocs = await textSplitter.splitDocuments(docs);
            console.log(`Split into ${splitDocs.length} chunks.`);

            // Create embeddings and the vector store
            console.log("Creating embeddings and vector store...");
            // Use FakeEmbeddings for now so compilation works reliably. Replace with
            // HuggingFaceInferenceEmbeddings (or another provider) when available.
            this.vectorStore = await MemoryVectorStore.fromDocuments(
                splitDocs,
                new FakeEmbeddings()
            );
            console.log("Vector store created successfully (using FakeEmbeddings).");

            // Create a retriever from the vector store
            this.retriever = this.vectorStore.asRetriever(3); // Retrieve top 3 relevant documents
            console.log("Retriever created.");

            // Set initialization flag to true upon success
            this.isVectorStoreInitialized = true;
            console.log("Vector store initialization complete.");

        } catch (error) {
            // Catch any errors during the initialization process (loading, splitting, embedding, vector store creation)
            console.error("Error during vector store initialization:", error);
            // Specific error handling for the 'fetching blob' error
            if (error && typeof (error as any).message === 'string' && (error as any).message.includes("An error occurred while fetching the blob")) {
                 console.error("This error often indicates issues with the Hugging Face API key, network connectivity to Hugging Face, or the availability of the embedding model.");
            }
            // Set initialization flag to false if an error occurs
            this.isVectorStoreInitialized = false;
            // Do not rethrow here to avoid unhandled exceptions; the initPromise will be rejected and handled by caller
            return;
        }
    }

    /**
     * Predicts a response based on the user's message using RAG or quick replies.
     * @param normalizedMessage The user's message, normalized.
     * @returns A promise resolving to the bot's response string.
     */
    async predilect(normalizedMessage: string): Promise<string> {
        if (!normalizedMessage || typeof normalizedMessage !== 'string') {
            return "Merci de fournir un message valide.";
        }
        // Vérifie d'abord le cache pour les questions fréquentes
        if (this.responseCache.has(normalizedMessage)) {
            console.log(`[BOT] Réponse depuis le cache pour : "${normalizedMessage}"`);
            return this.responseCache.get(normalizedMessage)!;
        }
        let botResponse: string;
        // Réponse rapide (salutation, etc.)
        const quickReply = detectQuickReplies(normalizedMessage);
        if (quickReply) {
            botResponse = quickReply;
            this.responseCache.set(normalizedMessage, botResponse); // On met aussi les quick replies en cache
            return botResponse;
        }
        // Si pas dans le cache ni quick reply, on fait le RAG
        if (!this.isVectorStoreInitialized || !this.retriever) {
            // If initialization hasn't completed yet, attempt to wait a short time for it (lazy init)
            try {
                if (!this.initPromise) {
                    this.initPromise = this.initVectorStore().catch(err => {
                        console.error('Lazy init failed', err);
                    });
                }
                // Wait up to 6 seconds for initialization to complete
                await Promise.race([
                    this.initPromise,
                    new Promise((_, rej) => setTimeout(() => rej(new Error('init timeout')), 6000))
                ]);
            } catch (e) {
                // still not ready after timeout or error
                console.warn('[BOT] Vector store not ready after waiting:', e && (e as any).message);
                return "Désolé, le système de connaissances n'est pas encore prêt. Veuillez réessayer plus tard.";
            }
            // if initPromise resolved, check flag again
            if (!this.isVectorStoreInitialized || !this.retriever) {
                return "Désolé, le système de connaissances n'est pas encore prêt. Veuillez réessayer plus tard.";
            }
        }
        try {
            const docs = await this.retriever.getRelevantDocuments(normalizedMessage);
            const stuffChain = await createStuffDocumentsChain({
                llm: this.groq,
                prompt: ChatPromptTemplate.fromMessages([
                    ["system", "Tu es un assistant expert. Utilise le contexte fourni pour répondre de façon précise et concise. Voici le contexte : {context} Si la réponse n'est pas dans le contexte, indique-le clairement."],
                    ["user", "{input}"]
                ]),
            });
            const result = await stuffChain.invoke({
                input: normalizedMessage,
                context: docs
            });
            botResponse = capitalizeFirstWord(removePhrase(result));
            this.responseCache.set(normalizedMessage, botResponse); // On met la réponse RAG en cache
        } catch (ragError) {
            console.error("Erreur lors de l'invocation de la chaîne RAG:", ragError);
            botResponse = "Désolé, une erreur est survenue lors du traitement de votre demande RAG. Veuillez réessayer.";
        }
        return botResponse;
    }

    /**
     * Placeholder for a function to formalize a question.
     * @param asked The question to formalize.
     * @returns A promise resolving to the formalised question string.
     */
    async formalise(asked: string): Promise<string> {
        // Implement formalization logic here
        // console.log(`Formalising question: "${asked}"`);
        return "Formalised response based on asked question";
    }

    /**
     * Placeholder for a function to process personal data.
     * @param data The personal data to process.
     * @returns A promise resolving to a confirmation string.
     */
    async personneldata(data: string): Promise<string> {
        // Implement personal data processing logic here
        // console.log(`Processing personal data: "${data}"`);
        return "Personal data processed";
    }
}

// --- Utility Functions ---

/**
 * Removes a specific phrase from the beginning of a string, case-insensitive.
 * @param input The input string.
 * @returns The string with the phrase removed.
 */
function removePhrase(input: string): string {
    const phraseToRemove = "Selon le contexte, ";
    // Use a regular expression with 'gi' flags for global and case-insensitive replacement
    return input.replace(new RegExp(phraseToRemove, 'gi'), '').trim();
}

/**
 * Detects if the message matches a predefined quick reply.
 * @param message The user's message.
 * @returns The quick reply string if a match is found, otherwise null.
 */
function detectQuickReplies(message: string): string | null {
    if (!message || typeof message !== 'string') return null;
    const quickReplies: { [key: string]: string } = {
        "bonjour": "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
        "salut": "Salut ! Que puis-je faire pour vous ?",
        "hello": "Hello ! Comment puis-je vous assister ?",
        "hi": "Hi there! Comment puis-je vous aider ?",
        "merci": "Avec plaisir ! Si vous avez d'autres questions, n'hésitez pas.",
        "au revoir": "Au revoir ! Passez une excellente journée."
    };

    const normalizedMessage = message.toLowerCase().trim(); // Normalize the message
    // Return the quick reply if the normalized message is a key in the quickReplies object
    return quickReplies[normalizedMessage] || null;
}

/**
 * Capitalizes the first word of a sentence.
 * @param sentence The input sentence string.
 * @returns The sentence with the first word capitalized.
 */
function capitalizeFirstWord(sentence: string): string {
    // Check if the input is a valid non-empty string
    if (!sentence || typeof sentence !== 'string') {
        return '';
    }

    const trimmedSentence = sentence.trim(); // Trim leading/trailing whitespace
    if (trimmedSentence.length === 0) {
        return ''; // Return empty string if sentence is empty after trimming
    }

    const words = trimmedSentence.split(' '); // Split the sentence into words

    // Handle cases with only one word or multiple words
    if (words.length > 0 && words[0].length > 0) {
        const firstWord = words[0];
        // Capitalize the first character and append the rest of the word
        const capitalizedFirstWord = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        words[0] = capitalizedFirstWord; // Replace the original first word
    }

    return words.join(' '); // Join the words back into a sentence
}
