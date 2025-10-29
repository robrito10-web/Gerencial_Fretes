import { supabase } from '../supabaseClient.js';

export class AuthService {

  _translateError(errorMessage) {
    if (!errorMessage) return 'Ocorreu um erro inesperado.';

    // Check for specific substrings first
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key value')) {
      return 'Este email já está em uso no sistema.';
    }
    if (errorMessage.includes('Unable to validate email address')) {
      return 'O formato do email fornecido é inválido.';
    }
    if (errorMessage.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }

    // Map for exact error messages
    const errorMap = {
      'Invalid login credentials': 'Email ou senha inválidos.',
      'User already registered': 'Este email já está cadastrado.',
      'To signup, please provide your email and password.': 'Para se cadastrar, forneça seu email e senha.',
      'Email rate limit exceeded': 'Muitas tentativas de email. Tente novamente mais tarde.'
    };
    
    return errorMap[errorMessage] || errorMessage; // Fallback to original message if no translation is found
  }
  
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found"
      console.error('Error fetching profile:', error);
    }
    return data;
  }

  async getAllUsersByAdmin(adminId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('admin_vinculado', adminId);

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data;
  }

  async getAllAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email')
      .eq('perfil', 'admin');

    if (error) {
      console.error('Error fetching admins:', error);
      return [];
    }
    return data;
  }

  async getAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, perfil, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all profiles:', error);
      return [];
    }
    return data;
  }
  
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: this._translateError(error.message) };
    }
    return { success: true, user: data.user };
  }

  async register(userData) {
    if (userData.email === 'robrito10@gmail.com') {
      return { success: false, error: 'Este email é reservado e não pode ser cadastrado por aqui.' };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          nome: userData.nome,
          telefone: userData.telefone,
          perfil: 'admin'
        }
      }
    });

    if (error) {
      return { success: false, error: this._translateError(error.message) };
    }
    return { success: true, user: data.user };
  }

  async inviteDriver(email, nome, adminId) {
    // The `inviteUserByEmail` function is an admin-only function and cannot be used from the client.
    // This is a secure workaround: sign up the user with a temporary password, then trigger a password reset email.
    
    // 1. Generate a strong, random temporary password.
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    // 2. Sign up the user. This will send a confirmation email by default.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
      options: {
        data: {
          nome: nome,
          perfil: 'motorista',
          admin_vinculado: adminId
        }
      }
    });

    if (signUpError) {
      return { success: false, error: this._translateError(signUpError.message) };
    }

    // 3. If sign up is successful, trigger a password reset email.
    // This allows the user to set their own password after confirming their email account.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });

    if (resetError) {
      // This is a non-critical error in this flow. The user account was created.
      console.error('Password reset email failed to send after invite:', resetError);
      return { 
          success: true, 
          warning: 'Usuário convidado, mas o email para definir a senha falhou. O motorista pode usar a opção "Esqueci minha senha" na tela de login.' 
      };
    }

    return { success: true };
  }
  
  async updateUserPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: this._translateError(error.message) };
    }
    return { success: true };
  }

  async resetPasswordForEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    if (error) {
        return { success: false, error: this._translateError(error.message) };
    }
    return { success: true };
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
  }
}
