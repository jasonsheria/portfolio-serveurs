import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Vehicule } from './vehicule.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class VehiculeService {
  constructor(@InjectModel(Vehicule.name) private vehiculeModel: Model<Vehicule>) {}

  async create(data: Partial<Vehicule>): Promise<Vehicule> {
    const v = new this.vehiculeModel(data);
    return v.save();
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, type, statut, prix_min, prix_max, annee_min, annee_max, carburant, transmission, couleur, sort = '-createdAt' } = query;
    const filter: any = {};
    if (type) filter.type = type;
    if (statut) filter.statut = statut;
    if (carburant) filter.carburant = carburant;
    if (transmission) filter.transmission = transmission;
    if (couleur) filter.couleur = couleur;
    if (prix_min || prix_max) {
      filter.prix = {};
      if (prix_min) filter.prix.$gte = Number(prix_min);
      if (prix_max) filter.prix.$lte = Number(prix_max);
    }
    if (annee_min || annee_max) {
      filter.annee = {};
      if (annee_min) filter.annee.$gte = Number(annee_min);
      if (annee_max) filter.annee.$lte = Number(annee_max);
    }

    const total = await this.vehiculeModel.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const dataRes = await this.vehiculeModel.find(filter).sort(sort).skip(skip).limit(limit).exec();
    return { data: dataRes, total, page: Number(page), pages, limit: Number(limit) };
  }

  async findAllRaw(query: any = {}) {
    const q = { ...query, page: 1, limit: 1000000 };
    const res = await this.findAll(q);
    return res.data || [];
  }

  async findByProprietaire(proprietaireId: string, type: string, query: any) {
    const { page = 1, limit = 10, sort = '-createdAt' } = query;
    const filter: any = {
      proprietaire: new Types.ObjectId(proprietaireId),
      proprietaireType: type,
    };
    const total = await this.vehiculeModel.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const dataRes = await this.vehiculeModel.find(filter).sort(sort).skip(skip).limit(limit).exec();
    return { data: dataRes, total, page: Number(page), pages, limit: Number(limit) };
  }

  async findOne(id: string): Promise<Vehicule> {
    const v = await this.vehiculeModel.findById(id).exec();
    if (!v) throw new NotFoundException('Véhicule non trouvé');
    return v;
  }

  async update(id: string, data: Partial<Vehicule>): Promise<Vehicule> {
    const v = await this.vehiculeModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!v) throw new NotFoundException('Véhicule non trouvé');
    return v;
  }

  async remove(id: string): Promise<{ message: string }> {
    const v = await this.vehiculeModel.findByIdAndDelete(id).exec();
    if (!v) throw new NotFoundException('Véhicule non trouvé');
    return { message: 'Véhicule supprimé avec succès' };
  }
}
