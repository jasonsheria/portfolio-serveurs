import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Mobilier } from './mobilier.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class MobilierService {
  constructor(@InjectModel(Mobilier.name) private mobilierModel: Model<Mobilier>) {}

  async create(data: Partial<Mobilier>): Promise<Mobilier> {
    const mobilier = new this.mobilierModel(data);
    return mobilier.save();
  }

  async findAll(query: any) {
    const {
      page = 1,
      limit = 10,
      site_id,
      type,
      categorie,
      commune,
      prix_min,
      prix_max,
      chambres,
      surface_min,
      surface_max,
      statut,
      proprietaireType,
      sort = '-createdAt'
    } = query;

    const filter: any = {};

    if (site_id) filter.site = new Types.ObjectId(site_id);
    if (type) filter.type = type;
    if (categorie) filter.categorie = categorie;
    if (commune) filter.commune = commune;
    if (statut) filter.statut = statut;
    if (chambres) filter.chambres = chambres;
    if (proprietaireType) filter.proprietaireType = proprietaireType;
    if (prix_min || prix_max) {
      filter.prix = {};
      if (prix_min) filter.prix.$gte = Number(prix_min);
      if (prix_max) filter.prix.$lte = Number(prix_max);
    }
    if (surface_min || surface_max) {
      filter.surface = {};
      if (surface_min) filter.surface.$gte = Number(surface_min);
      if (surface_max) filter.surface.$lte = Number(surface_max);
    }

    const total = await this.mobilierModel.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const mobiliers = await this.mobilierModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'proprietaire',
        select: '-password'
      })
      .populate('site')
      .exec();

    return {
      data: mobiliers,
      total,
      page: Number(page),
      pages,
      limit: Number(limit)
    };
  }

  /**
   * Return all mobilier items as a plain array (no pagination).
   * This is a convenience used by lightweight frontends that expect an array.
   */
  async findAllRaw(query: any = {}) {
    // Ask the paginated findAll to return a large page so we get all items.
    const q = { ...query, page: 1, limit: 1000000 };
    const res = await this.findAll(q);
    return res.data || [];
  }

  async findByProprietaire(proprietaireId: string, type: string, query: any) {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = query;

    const filter = {
      proprietaire: new Types.ObjectId(proprietaireId),
      proprietaireType: type
    };

    const total = await this.mobilierModel.countDocuments(filter);
    console.log("Total biens for proprietaire:", total);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const mobiliers = await this.mobilierModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'proprietaire',
        select: '-password'
      })
      .populate('site')
      .exec();
      console.log("Mobiliers found:", mobiliers.length);

    return {
      data: mobiliers,
      total,
      page: Number(page),
      pages,
      limit: Number(limit)
    };
  }

  async findOne(id: string): Promise<Mobilier> {
    const mobilier = await this.mobilierModel
      .findById(id)
      .populate({
        path: 'proprietaire',
        select: '-password'
      })
      .populate('site')
      .exec();

    if (!mobilier) throw new NotFoundException('Bien non trouvé');
    return mobilier;
  }

  async update(id: string, data: Partial<Mobilier>): Promise<Mobilier> {
    const mobilier = await this.mobilierModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate({
        path: 'proprietaire',
        select: '-password'
      })
      .populate('site')
      .exec();

    if (!mobilier) throw new NotFoundException('Bien non trouvé');
    return mobilier;
  }

  async remove(id: string): Promise<{ message: string }> {
    const mobilier = await this.mobilierModel.findByIdAndDelete(id).exec();
    if (!mobilier) throw new NotFoundException('Bien non trouvé');
    return { message: 'Bien supprimé avec succès' };
  }

  // Méthodes statistiques
  async getStatsByProprietaire(proprietaireId: string, type: string) {
    const stats = await this.mobilierModel.aggregate([
      {
        $match: {
          proprietaire: new Types.ObjectId(proprietaireId),
          proprietaireType: type
        }
      },
      {
        $group: {
          _id: null,
          totalBiens: { $sum: 1 },
          totalVues: { $sum: '$vues' },
          totalFavoris: { $sum: '$favoris' },
          prixMoyen: { $avg: '$prix' }
        }
      }
    ]);

    const parType = await this.mobilierModel.aggregate([
      {
        $match: {
          proprietaire: new Types.ObjectId(proprietaireId),
          proprietaireType: type
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const parStatut = await this.mobilierModel.aggregate([
      {
        $match: {
          proprietaire: new Types.ObjectId(proprietaireId),
          proprietaireType: type
        }
      },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      global: stats[0] || {
        totalBiens: 0,
        totalVues: 0,
        totalFavoris: 0,
        prixMoyen: 0
      },
      parType: parType.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      parStatut: parStatut.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  }
}
