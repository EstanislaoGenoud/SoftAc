import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity.js';
import { Tenant } from '../users/entities/tenant.entity.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: Record<string, any>) {
    const userExists = await this.usuarioRepository.findOne({ where: { email: registerDto.email } });
    if (userExists) throw new ConflictException('El correo ya está registrado');

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(registerDto.password, salt);

    // 1. Crear el usuario
    const user = this.usuarioRepository.create({
      id: uuidv4(),
      email: registerDto.email,
      password_hash: hash,
      nombre: registerDto.nombre,
    });
    await this.usuarioRepository.save(user);

    // 2. Crear su entrada en la tabla tenants apuntando a tenant_demo_db
    const tenant = this.tenantRepository.create({
      id: uuidv4(),
      usuario_id: user.id,
      db_name: 'tenant_demo_db', // Asignamos la BD que acabas de crear
      estado: 'CREADO'
    });
    await this.tenantRepository.save(tenant);

    return { message: 'Usuario registrado con éxito. Ya puedes iniciar sesión.' };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usuarioRepository.findOne({ 
      where: { email },
      relations: ['tenant']
    });

    if (user && await bcrypt.compare(pass, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    if (!user.tenant || !user.tenant.db_name) {
      throw new UnauthorizedException('El usuario no tiene un entorno asignado.');
    }

    const payload = { 
      email: user.email, 
      sub: user.id, 
      tenantDbName: user.tenant.db_name 
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: { id: user.id, nombre: user.nombre, email: user.email }
    };
  }
}
