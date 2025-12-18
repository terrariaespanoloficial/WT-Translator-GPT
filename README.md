# Configuración
1. Requieres tener instalado [Node](https://nodejs.org/es) (v20.15.1 o superior) para correr este proyecto.
2. Con Node instalado, ejecuta el comando `npm i` en una consola desde el directorio del proyecto para empezar a descargar todos los paquetes necesarios.
3. Configura las variables de entorno.

# Variables de entorno
Las variables de entorno se definen en el archivo `.env` que debes crear junto a los demás archivos del proyecto. son valores necesarios para poder ajustar el programa a tus necesidades.

- **OPENAI_API_KEY**: La ApiKey del proyecto de [OpenAi]() a utilizar.
- **DISCORD_TOKEN**: El token del [bot de Discord]().
- **OPERATORS**: Una lista con los IDs de los usuarios de Discord que pueden utilizar el bot.

Ejemplo de archivo:
```env
OPENAI_API_KEY=randomString
DISCORD_TOKEN=evenMoreRandomString
OPERATORS=["1234567890123", "9876543210987"]
```

# Ejecución
Una vez configurado todo el proyecto puedes empezar a utilizarlo ejecutando el comando `npx ts-node source/index.ts` en una consola desde el directorio del proyecto.
El bot en discord se mostrará activo y detendrá su actividad una vez se cierre la consola.
