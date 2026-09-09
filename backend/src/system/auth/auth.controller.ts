import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenBlacklistService } from './token-blacklist.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

// @Controller('auth') indica que todas las rutas aquí empezarán con http://localhost:3000/auth
@Controller('auth')
export class AuthController {
  
  // Inyectamos nuestros servicios para poder usarlos en los endpoints
  constructor(
    private readonly authService: AuthService,
    private readonly blacklistService: TokenBlacklistService
  ) {}

  // Endpoint Público: Para registrar a un docente nuevo
  @Post('register')
  async register(@Body() registerDto: Record<string, any>) {
    return this.authService.register(registerDto);
  }

  // Endpoint Público: Para iniciar sesión.
  // Usamos @HttpCode(HttpStatus.OK) para que devuelva un 200 en lugar del 201 (Creado) que NestJS pone por defecto en los POST.
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() signInDto: Record<string, any>) {
    // 1. Verificamos si el correo y contraseña coinciden en la base de datos
    const user = await this.authService.validateUser(signInDto.email, signInDto.password);
    
    // 2. Si no coinciden, "rebotamos" al usuario con un error 401
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    
    // 3. Si todo está bien, le generamos su "Llave de acceso" (JWT)
    return this.authService.login(user);
  }

  // Endpoint Privado: Cerrar sesión
  // @UseGuards(JwtAuthGuard) obliga a que el usuario envíe un Token válido para poder ejecutar esto
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Request() req: any) {
    // Capturamos el token que viene en la cabecera (Header) "Authorization: Bearer <token>"
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Lo metemos a la lista negra para que quede inutilizado para siempre
      this.blacklistService.add(token); 
    }
    return { message: 'Sesión cerrada con éxito. El token ha sido destruido.' };
  }

  // Endpoint Público: Pedir enlace de recuperación
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  // Endpoint Público: Cambiar contraseña usando el Token temporal
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
