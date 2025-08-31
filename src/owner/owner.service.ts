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
      
      // Vérifier si l'email existe déjà
      const existingOwner = await this.ownerModel.findOne({ email: createOwnerDto.email });
      if (existingOwner) {
        throw new BadRequestException('Un propriétaire avec cet email existe déjà');
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
  async findByUserId(userId: Types.ObjectId) {
    try {
      const owner = await this.ownerModel.findOne({ user: userId }).populate('user');
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

  async findAll() {
    return await this.ownerModel.find().populate('user');
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
    if (owner.isActive || owner.subscriptionType) {
      throw new BadRequestException('Vous avez déjà épuisé votre temps d\'essai gratuit. Veuillez choisir un autre type d\'abonnement.');
    }

    // Activer le compte avec l'abonnement freemium
    owner.isActive = true;
    owner.subscriptionType = 'freemium';
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
