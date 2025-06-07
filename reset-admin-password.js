import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

async function resetAdminPassword() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the admin user password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'saabox@yandex.ru']
    );
    
    console.log('✅ Admin password reset successfully!');
    console.log('Email: saabox@yandex.ru');
    console.log('Password: admin123');
    console.log('Affected rows:', result.rowCount);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();