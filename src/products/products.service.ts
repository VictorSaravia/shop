import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDTO } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductService');
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
  ) {}
  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      const saveRepository = await this.productRepository.save(product);
      console.log(`${JSON.stringify({ saveRepository })}`);
      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDTO: PaginationDTO) {
    try {
      console.log({ paginationDTO });
      const { limit = 10, offset = 2 } = paginationDTO;
      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
      });
      console.log({ products });
      return products;
    } catch (error) {
      this.logger.error(error);
    }
  }

  async findOne(term: string) {
    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title)=:title or slug=:slug', {
          title: term.toUpperCase(),
          slug: term,
        })
        .getOne();
    }
    if (!product) {
      throw new NotFoundException(`Product with ${term} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id,
      ...updateProductDto,
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    try {
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const product = await this.findOne(id);
      const removeProduct = await this.productRepository.remove(product);
      return removeProduct;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
