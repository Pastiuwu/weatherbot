const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

function getWeatherEmoji(iconCode) {
  const emojiMap = {
    '01d': '☀️', '01n': '🌙',  // Clear sky
    '02d': '⛅', '02n': '⛅',  // Few clouds
    '03d': '☁️', '03n': '☁️',  // Scattered clouds
    '04d': '☁️', '04n': '☁️',  // Broken clouds
    '09d': '🌧️', '09n': '🌧️',  // Shower rain
    '10d': '🌦️', '10n': '🌦️',  // Rain
    '11d': '⛈️', '11n': '⛈️',  // Thunderstorm
    '13d': '❄️', '13n': '❄️',  // Snow
    '50d': '🌫️', '50n': '🌫️'   // Mist
  };
  return emojiMap[iconCode] || '🌡️';
}

function getDayName(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString('es-ES', { weekday: 'long' });
}

// pronóstico diario (5 DIAS)
async function getWeeklyForecast(ciudad, pais) {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${ciudad}${pais ? ',' + pais : ''}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=es&cnt=40`
    );
    
    const forecastByDay = {};
    response.data.list.forEach(item => {
      const day = getDayName(item.dt);
      if (!forecastByDay[day]) {
        forecastByDay[day] = {
          min: Math.round(item.main.temp_min),
          max: Math.round(item.main.temp_max),
          icon: item.weather[0].icon
        };
      } else {
        forecastByDay[day].min = Math.min(forecastByDay[day].min, Math.round(item.main.temp_min));
        forecastByDay[day].max = Math.max(forecastByDay[day].max, Math.round(item.main.temp_max));
      }
    });
    
    const today = getDayName(Date.now() / 1000);
    return Object.entries(forecastByDay)
      .filter(([day]) => day !== today)
      .slice(0, 5);
  } catch (error) {
    console.error("Error en pronóstico semanal:", error);
    return null;
  }
}

// probabilidad de precipitación
async function getPrecipitationProbability(ciudad, pais) {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${ciudad}${pais ? ',' + pais : ''}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=es&cnt=5`
    );
    
    const maxProbability = Math.max(...response.data.list.slice(0, 4).map(item => 
      item.pop ? Math.round(item.pop * 100) : 0
    ));
    
    return maxProbability > 0 ? `${maxProbability}%` : "0%";
  } catch (error) {
    console.error("Error al obtener probabilidad de lluvia:", error);
    return "N/A";
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.on('ready', async () => {
  console.log(`✅ ${client.user.tag} está conectado!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'clima') {
    await interaction.deferReply();
    
    const ciudad = interaction.options.getString('ciudad');
    const pais = interaction.options.getString('pais') || '';

    try {
      const [currentResponse, weeklyForecast, precipProbability] = await Promise.all([
        axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${ciudad}${pais ? ',' + pais : ''}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=es`
        ),
        getWeeklyForecast(ciudad, pais),
        getPrecipitationProbability(ciudad, pais)
      ]);

      const data = currentResponse.data;
      const embed = new EmbedBuilder()
        .setTitle(`🌤️ Clima en ${data.name}, ${data.sys.country}`)
        .setColor('#4F46E5')
        .addFields(
          { name: '🌡️ Actual', value: `${Math.round(data.main.temp)}°C`, inline: true },
          { name: '⬇️ Mínima', value: `${Math.round(data.main.temp_min)}°C`, inline: true },
          { name: '⬆️ Máxima', value: `${Math.round(data.main.temp_max)}°C`, inline: true },
          { name: '💦 Humedad', value: `${data.main.humidity}%`, inline: true },
          { name: '💨 Viento', value: `${Math.round(data.wind.speed)} km/h`, inline: true },
          { name: '🌧️ Prob. lluvia', value: precipProbability, inline: true }
        )
        .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`);

      // Añadir pronóstico semanal 
      if (weeklyForecast) {
        embed.addFields({
          name: '📅 Pronóstico semanal',
          value: weeklyForecast.map(([day, forecast]) => 
            `${getWeatherEmoji(forecast.icon)} **${day.charAt(0).toUpperCase() + day.slice(1)}:** ${forecast.max}°C / ${forecast.min}°C`
          ).join('\n'),
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Error al obtener el clima. Verifica el nombre de la ciudad.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);