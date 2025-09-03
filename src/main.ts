// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io'; // <-- Décommenter l'import
import { NestExpressApplication } from '@nestjs/platform-express'; // Importez NestExpressApplication
import * as path from 'path'; // Importez le module path de Node.js
import { ValidationPipe } from '@nestjs/common';
import { CorsExceptionFilter } from './filters/cors-exception.filter';
async function bootstrap() {
  // Spécifiez NestExpressApplication comme type pour l'application pour avoir accès à useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  // Configuration CORS pour permettre la c-é-exion depuis votre frontend (HTML)
  // --- CORS complet pour API REST & WebSocket (localhost + prod) ---
  // Configuration CORS améliorée pour gérer les erreurs
  app.enableCors({
    origin: (origin, callback) => {
      const isProduction = process.env.NODE_ENV === 'production';
      
      const allowedOrigins = [
        'https://jason-gachaba.onrender.com',
        'https://jimmyrais-portfolio-rbof.onrender.com',
        'https://pierre-design.onrender.com',
        'https://micho-ngabo.onrender.com',
        'https://patrick-kalengayi.onrender.com',
        'https://luc-byamungu.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'https://wise-technology.onrender.com',
        'https://wise-hosting.onrender.com',
        'https://pierre-archi.onrender.com',
        'https://localhost:1000',
        'https://pierre-design.onrender.com',
        'http://127.0.1:5500:3000',
        'https://my-portfolio-vitrine.onrender.com'
      ];
      
      // En développement, être plus permissif
      if (!isProduction) {
        // Autoriser localhost sur tous les ports
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          console.log(`[CORS] Allowing origin: ${origin || 'no-origin'}`);
          return callback(null, true);
        }
      }
      
      // Autoriser les requêtes sans origin (ex: curl, tests locaux, mobile apps)
      if (!origin) {
        console.log('[CORS] Allowing no-origin request (curl/postman/mobile)');
        return callback(null, true);
      }
      
      // Vérifier les origins autorisées
      if (allowedOrigins.includes(origin)) {
        console.log(`[CORS] Allowing whitelisted origin: ${origin}`);
        return callback(null, true);
      }
      
      // Log de l'origine rejetée pour debugging
      console.error(`[CORS] Rejecting origin: ${origin}`);
      return callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'Origin', 
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200
  });
  // Middleware global pour gérer les erreurs CORS
  app.use((req, res, next) => {
    // Log des requêtes pour debugging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'no-origin'}`);
    
    // Headers CORS de secours pour les requêtes qui passent
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Répondre immédiatement aux requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      console.log('[CORS] Handling preflight request');
      return res.status(200).end();
    }
    
    next();
  });

  // Utiliser le filtre global pour les erreurs CORS
  app.useGlobalFilters(new CorsExceptionFilter());

  // Utiliser ValidationPipe globalement
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  // Utiliser le dossier persistant Render pour les fichiers
  const uploadsPath = '/upload';
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads', // Ce préfixe doit correspondre à celui utilisé dans pictureUrl
    fallthrough: false, // Pour que les erreurs soient catchées ici
  });
  // **ACTIVER L'ADAPTATEUR SOCKET.IO**f
  // Cette ligne lie l'adaptateur Socket.IO à votre application NestJS
  app.useWebSocketAdapter(new IoAdapter(app)); // <-- Ajouter cette ligne !

  // Définir le port d'écoute
  const port = process.env.PORT || 5000; // Use a port allowed by Render.com
  await app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
bootstrap();