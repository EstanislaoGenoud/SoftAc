import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity.js';
import { Tenant } from '../users/entities/tenant.entity.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

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

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(registerDto.password, salt);

    const user = this.usuarioRepository.create({
      id: uuidv4(),
      email: registerDto.email,
      password_hash: hash,
      nombre: registerDto.nombre,
    });
    await this.usuarioRepository.save(user);

    // 1. Generamos un nombre único para la base de datos de este nuevo profe
    // Reemplazamos los guiones del UUID porque MySQL no los permite en nombres de BD
    const dbName = `tenant_${user.id.replace(/-/g, '_')}`;

    // 2. Le ordenamos a MySQL que cree físicamente esta nueva base de datos vacía
    await this.usuarioRepository.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);

    // 3. Guardamos el registro que vincula a este usuario con su nueva BD
    const tenant = this.tenantRepository.create({
      id: uuidv4(),
      usuario_id: user.id,
      db_name: dbName,
      estado: 'CREADO'
    });
    await this.tenantRepository.save(tenant);

    return { message: 'Usuario registrado con éxito.' };
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
    const payload = { email: user.email, sub: user.id, tenantDbName: user.tenant.db_name };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: { id: user.id, nombre: user.nombre, email: user.email }
    };
  }

  // --- NUEVA LÓGICA DE RECUPERACIÓN (HU-03) ---

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usuarioRepository.findOne({ where: { email: forgotPasswordDto.email } });
    
    if (!user) {
      // Regla de Seguridad: Siempre retornamos éxito para evitar enumeración de correos
      return { message: 'Si el correo existe, se enviaron instrucciones.' };
    }

    // Firmar token de un solo uso que expira en 15 minutos
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'pwd-reset' },
      { expiresIn: '15m', secret: process.env.JWT_RESET_SECRET || 'llave-reset-segura' }
    );

    // TODO: Aquí iría la integración con Nodemailer/SendGrid
    console.log(`\n========================================`);
    console.log(`📧 [EMAIL SIMULADO EN CONSOLA]`);
    console.log(`Para: ${user.email}`);
    console.log(`Asunto: Recuperación de contraseña`);
    console.log(`Haz clic aquí para cambiar tu contraseña:`);
    console.log(`http://localhost:5173/reset-password?token=${resetToken}`);
    console.log(`========================================\n`);

    return { message: 'Si el correo existe, se enviaron instrucciones.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      // 1. Validar expiración y firma
      const payload = this.jwtService.verify(resetPasswordDto.token, {
        secret: process.env.JWT_RESET_SECRET || 'llave-reset-segura'
      });

      if (payload.type !== 'pwd-reset') {
        throw new UnauthorizedException('El token no es de recuperación');
      }

      // 2. Buscar usuario
      const user = await this.usuarioRepository.findOne({ where: { id: payload.sub } });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      // 3. Generar nuevo hash
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(resetPasswordDto.newPassword, salt);
      
      await this.usuarioRepository.save(user);

      return { message: 'Contraseña actualizada correctamente.' };
      
    } catch (error) {
      throw new UnauthorizedException('El token es inválido o ha expirado.');
    }
  }
}
