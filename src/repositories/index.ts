import { Model, ModelStatic, FindOptions, CreateOptions, UpdateOptions, DestroyOptions } from "sequelize";

class BaseRepository<T extends Model> {
    protected model: ModelStatic<T>;

    constructor(model: ModelStatic<T>) {
        this.model = model;
    }

    // Create
    async create(data: Partial<T>, options?: CreateOptions): Promise<T> {
        return await this.model.create(data as any, options);
    }

    // Bulk Create
    async bulkCreate(data: Partial<T>[], options?: CreateOptions): Promise<T[]> {
        return await this.model.bulkCreate(data as any[], options);
    }

    // Find By PK
    async findById(id: number | string, options?: FindOptions): Promise<T | null> {
        return await this.model.findByPk(id, options);
    }

    // Find One
    async findOne(options: FindOptions): Promise<T | null> {
        return await this.model.findOne(options);
    }

    // Find All
    async findAll(options?: FindOptions): Promise<T[]> {
        return await this.model.findAll(options);
    }

    // Update
    async update(
        data: Partial<T>,
        options: UpdateOptions
    ): Promise<[number]> {
        return await this.model.update(data as any, options);
    }

    // Delete
    async delete(options: DestroyOptions): Promise<number> {
        return await this.model.destroy(options);
    }

    // Count
    async count(options?: FindOptions): Promise<number> {
        return await this.model.count(options);
    }

    // Pagination
    async findAndCountAll(options?: FindOptions) {
        return await this.model.findAndCountAll(options);
    }
}

export default BaseRepository