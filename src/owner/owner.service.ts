import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Owner } from '../entity/owner/owner.schema';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { Types } from 'mongoose';

@Injectable()
export class OwnerService {
  constructor(
    @InjectModel(Owner.name) private ownerModel: Model<Owner>
  ) {}

  async create(createOwnerDto: CreateOwnerDto): Promise<Owner> {
    try {
      // Vérifier si l'utilisateur a déjà un compte propriétaire
      const existingOwnerByUser = await this.ownerModel.findOne({ user: createOwnerDto.user });
      if (existingOwnerByUser) {
        throw new BadRequestException('Vous possédez déjà un compte propriétaire');
      }
      // Créer le nouveau propriétaire
      const newOwner = new this.ownerModel(createOwnerDto);
      return await newOwner.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création du propriétaire: ' + error.message);
    }
  }

  async createAgency(userId: Types.ObjectId, agencyData: any): Promise<Owner> {
    try {
      // Vérifier si l'utilisateur a déjà un compte Owner
      let owner = await this.ownerModel.findOne({ user: userId });
      if (owner) {
        // Mettre à jour le compte existant en type agency
        owner.accountType = 'agency';
        owner.isAgency = true;
        // owner.nom = agencyData.name || owner.nom || '';
        // owner.email = agencyData.email || owner.email || '';
        // owner.phone = agencyData.phone || owner.phone || '';
        // owner.address = agencyData.address || owner.address || '';
        owner.types = ['Agence Immobilière'];
        owner.subscriptionType = agencyData.subscriptionType || owner.subscriptionType || 'freemium';
        // owner.status = 'pending';
        // owner.isActive = false;
        // S'assurer que les champs requis sont présents
        // owner.postnom = owner.postnom || '';
        // owner.prenom = owner.prenom || '';
        // owner.idFilePath = owner.idFilePath || '/uploads/default-id.pdf';
        // owner.propertyTitlePaths = owner.propertyTitlePaths || [];
        await owner.save();
        return owner;
      } else {
        // Créer un nouveau compte agence
        const newAgency = new this.ownerModel({
          nom: agencyData.name || '',
          postnom: '',
          prenom: '',
          email: agencyData.email || '',
          phone: agencyData.phone || '',
          address: agencyData.address || '',
          types: ['Agence Immobilière'],
          idFilePath: '/uploads/default-id.pdf',
          propertyTitlePaths: [],
          user: userId,
          accountType: 'agency',
          isAgency: true,
          subscriptionType: agencyData.subscriptionType || 'freemium',
          status: 'pending',
          isActive: false,
        });
        return await newAgency.save();
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création ou mise à jour du compte agence: ' + error.message);
    }
  }
  async findByUserId(userId: Types.ObjectId) {
    try {
      let owner = await this.ownerModel.findOne({ user: userId }).populate('user');
      // Fallback: sometimes user is stored as string or different field; try string match
      if (!owner) {
        owner = await this.ownerModel.findOne({ 'user': String(userId) }).populate('user');
      }
      // Another fallback: some records might have nested user._id
      if (!owner) {
        owner = await this.ownerModel.findOne({ 'user._id': userId }).populate('user');
      }
      if (!owner) {
        return { hasAccount: false };
      }
      return {
        hasAccount: true,
        owner: owner
      };
    } catch (error) {
      throw new BadRequestException('Erreur lors de la vérification du compte owner');
    }
  }

  async getProfile(userId: Types.ObjectId) {
    try {
      const owner = await this.ownerModel.findOne({ user: userId })
        .populate('user')
        .select('nom postnom prenom phone rating certified certRequested certificationNote subscriptionType address types idFilePath propertyTitlePaths status isActive subscriptionEndDate');
      
      if (!owner) {
        throw new NotFoundException('Profil propriétaire non trouvé');
      }

      const user = owner.user;

      // Formater la réponse
      return {
        id: owner._id,
        name: `${owner.nom} ${owner.postnom} ${owner.prenom}`,
        email: user.email,
        phone: owner.phone,
        rating: owner.rating || 0,
        certified: owner.certified || false,
        certRequested: owner.certRequested || false,
        certificationNote: owner.certificationNote || '',
        subscription: owner.subscriptionType || 'basic',
        // Informations supplémentaires du propriétaire
        address: owner.address,
        types: owner.types,
        idFilePath: owner.idFilePath,
        propertyTitlePaths: owner.propertyTitlePaths,
        status: owner.status,
        isActive: owner.isActive,
        subscriptionEndDate: owner.subscriptionEndDate,
        // Informations de l'utilisateur
        user: {
          username: user.username,
          profileUrl: user.profileUrl || '/img/logo.svg',
          secondName: user.secondName,
          telephone: user.telephone,
          dateOfBirth: user.dateOfBirth,
          logo: user.logo,
          userAddress: user.address,
          city: user.city,
          country: user.country,
          postalCode: user.postalCode,
          description: user.description,
          experience: user.experience,
          website: user.website,
          languesParlees: user.languesParlees,
          sport: user.sport,
          objectifs: user.objectifs,
          // Informations de l'entreprise
          company: {
            name: user.companyName,
            description: user.companyDescription,
            website: user.companyWebsite,
            logo: user.companyLogo,
            address: user.companyAddress,
            phone: user.companyPhone,
            email: user.companyEmail
          },
          // Réseaux sociaux
          social: {
            linkedin: user.linkedin,
            github: user.github,
            facebook: user.facebook,
            whatsapp: user.whatsapp,
            instagram: user.instagram
          },
          // Informations professionnelles
          professional: {
            domaine: user.domaine,
            expertise: user.expertise
          },
          // Images et fichiers
          media: {
            profileImage1: user.profileImage1,
            profileImage2: user.profileImage2,
            profileImage3: user.profileImage3,
            cvFile: user.cvFile,
            postalCardFile: user.postalCardFile
          }
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la récupération du profil : ' + error.message);
    }
  }

  async findAll(site : any) {
    return await this.ownerModel.find().populate('user');
  }

  // Debug helper: return all owner records that reference the given user id
  async findAllByUserId(userId: Types.ObjectId) {
    try {
      const list = await this.ownerModel.find({ user: userId }).populate('user').lean();
      return list;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la récupération des propriétaires pour l’utilisateur');
    }
  }

  async findOne(id: string) {
    const owner = await this.ownerModel.findById(id).populate('user');
    if (!owner) {
      throw new NotFoundException('Propriétaire non trouvé');
    }
    return owner;
  }

  async update(id: string, updateOwnerDto: UpdateOwnerDto) {
    const owner = await this.ownerModel.findByIdAndUpdate(id, updateOwnerDto, { new: true });
    if (!owner) {
      throw new NotFoundException('Propriétaire non trouvé');
    }
    return owner;
  }

  async activateFreemium(ownerId: Types.ObjectId, userId: Types.ObjectId) {
    // Vérifier que le owner existe et appartient à l'utilisateur
    const owner = await this.ownerModel.findOne({
      _id: ownerId,
      user: userId
    });

    if (!owner) {
      throw new NotFoundException('Propriétaire non trouvé ou non autorisé');
    }

    // Vérifier si le compte a déjà été activé avec un abonnement
    if (owner.subscriptionEndDate< new Date() && owner.subscriptionType ==='freemium') {
      // throw new BadRequestException('Vous avez déjà épuisé votre temps d\'essai gratuit. Veuillez choisir un autre type d\'abonnement.');
      return {
      message: 'Vous etes deja en mode freemium et vous avez epuisez le temps d\'essaie',
      owner
    };
    }

    // Activer le compte avec l'abonnement freemium
    owner.isActive = true;  owner.subscriptionType = 'freemium';
    owner.status = 'active';
    owner.paymentId = null;
    // Définir la date de fin d'abonnement à 1 an par défaut
   
   owner.subscriptionEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await owner.save();

    return {
      message: 'Compte activé avec succès en mode freemium',
      owner
    };
  }

  async activateCommission(ownerId: Types.ObjectId, userId: Types.ObjectId) {
    // Vérifier que le owner existe et appartient à l'utilisateur
    const owner = await this.ownerModel.findOne({
      _id: ownerId,
      user: userId
    });

    if (!owner) {
      throw new NotFoundException('Propriétaire non trouvé ou non autorisé');
    }

    // Activer le compte avec l'abonnement commission
    owner.isActive = true;
    owner.subscriptionType = 'commission';
    owner.status = 'active';
    owner.paymentId = null;
    // Pas de date de fin pour l'abonnement commission car il est permanent
    owner.subscriptionEndDate = null;

    await owner.save();

    return {
      message: 'Compte activé avec succès en mode commission',
      owner
    };
  }

  async remove(id: string) {
    const owner = await this.ownerModel.findByIdAndDelete(id);
    if (!owner) {
      throw new NotFoundException('Propriétaire non trouvé');
    }
    return { message: 'Propriétaire supprimé avec succès' };
  }
}
