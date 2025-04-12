const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'clima',
    description: 'Muestra el clima exacto por ciudad y país',
    options: [
      {
        name: 'ciudad',
        description: 'Nombre de la ciudad (ej: Santiago)',
        type: 3, 
        required: true,
      },
      {
        name: 'pais',
        description: 'Código de país (ej: AR, MX, ES)',
        type: 3, 
        required: false, // Recomendado
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('📡 Registrando comandos...');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ ¡Comandos registrados con éxito!');
  } catch (error) {
    console.error('❌ Error al registrar comandos:', error);
  }
})();