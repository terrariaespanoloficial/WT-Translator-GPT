import dotenv from 'dotenv';
import Https from "https";
import { AttachmentBuilder, Client, Routes, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import { OpenAI } from "openai";
import { JSDOM } from "jsdom";

dotenv.config();
if(process.env.DISCORD_TOKEN == null || process.env.OPENAI_API_KEY == null || process.env.OPERATORS == null ) throw new Error("Todas las variables de entorno deben establecerse. Más información en el README.md");
let operators: string[];
try { operators = JSON.parse(process.env.OPERATORS!); }
catch (error) { throw new Error("La variable de entorono OPERATORS no tiene una estructura valida. Más información en el README.md") }

const discordClient = new Client({ intents: ["Guilds"] });
const openaiClient = new OpenAI(
{
    apiKey: process.env.OPENAI_API_KEY,
});
const modelPrompt = `Recibirás un fragmento de documento de wikimedia en inglés, deberás traducirlo todo al español. Exceptuando solo las cadenas de texto que cumplan las siguientes condiciones.
Condición 1: La cadena tiene o es "wiki template".
Condición 2: La cadena es "drop", "pvp", "loot", "buff", "debuff", "dash", "npc", "tooltip". 
Si la cadena incluye las palabras "Crafting" o sus formas, tradúcelas como "Creación". Si incluye "Item", tradúcela como "Objeto". Si incluye "Tiles", tradúzcalo como "Bloques".
Los markup de enlace [[text]] debe ser reemplazados sin traducir por [[{{tr|text}}]]. Ejemplos:
- [[text]] -> [[{{tr|text}}]]
- [[text moretext]] -> [[{{tr|text moretext}}]
- [[text1|text2]] -> [[{{tr|text1}}text2]]
Los markup de cabecera se deben traducir siempre. Ejemplos:
- = Titulo 1 =
- == Titulo 2 ==
- === Titulo 3 ===
- ==== Titulo 4 ====
- ===== Titulo 5 =====
- ====== Titulo 6 ======
Los markups de lista se deben traducir siempre. Ejemplos:
- # Punto uno
- # Punto dos
- # Punto tres
- ## Punto tres  subpunto uno
- # Punto cuatro
Los markup de punto se deben traducir siempre. Ejemplos:
* Primer punto
* Segundo punto
* Tercer punto
** Tercer punto, primer subpunto
* Cuarto punto
Los markup de sangria se deben traducir siempre. Ejemplos:
- Sin sangría
- : Primera sangría
- :: Segunda sangría
- ::: y así
Los siguientes markups se deben traducir siempre:
- ''text''
- '''text'''
- <del>text</del>
- <ins>text</ins>
- <sup>text</sup>`

async function GetContent(url: string): Promise<string>
{
    return new Promise((resolve, reject) =>
    {
        let data: string = "";
        Https.get(`${url.endsWith("/") ? url.slice(0, -1) : url}?action=edit`, response =>
        {
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => data += chunk);
            response.on("end", () =>
            {
                const dom = new JSDOM(data);
                const container = dom.window.document.getElementById("wpTextbox1");
                if(container && container.textContent) return resolve(container.textContent);
                reject(new Error("Ningún área del documento coincide con el tipo que el programa busca. ¿Será el tipo de página correcta?"));
            });
        });
    })
}

discordClient.on("ready", async () =>
{
    try
    {
        await discordClient.rest.put(
            Routes.applicationCommands(discordClient.user!.id),
            {
                body:
                [
                    new SlashCommandBuilder()
                    .setName("traducir")
                    .setDescription("Devuelve un archivo con la página traducida")
                    .addStringOption(
                        new SlashCommandStringOption()
                        .setName("url")
                        .setDescription("Url de la página. Ejemplo: https://terraria.wiki.gg/wiki/Coins")
                        .setRequired(true)
                    )
                    .addBooleanOption(
                        new SlashCommandBooleanOption()
                        .setName("modo_eco")
                        .setDescription("Mayor velocidad de respuesta y Ahorra hasta %97 de gastos. A costa de reducir la calidad.")
                        .setRequired(false)
                    )
                    .addIntegerOption(
                        new SlashCommandIntegerOption()
                        .setName("tokens_maximos")
                        .setDescription("Si el bot no genera completamente los documentos, puede ser útil aumentar este valor")
                        .setRequired(false)
                        .setMinValue(256)
                        .setMaxValue(8192)
                    )
                ]
            }
        )
    }
    catch (error) { console.log("Aviso: No se han actualizado los comandos debido a un error ¿El programa se ha estado re-ejecutando muchas veces seguidas?"); }
    console.log("Listo");
});
discordClient.on("interactionCreate", async (interaction) =>
{
    if (!(interaction.isChatInputCommand() && interaction.commandName == "traducir")) return;
    if(!operators.includes(interaction.user.id))
    {
        await interaction.reply(
        {
            content: "No tienes los permisos para ejecutar este comando \n-# ¿Crees que es un error? Consulta el README.md",
            ephemeral: true,
        });
        return;
    }
    await interaction.deferReply();
    
    const url: string = interaction.options.getString("url", true);
    const ecoMode: boolean = interaction.options.getBoolean("modo_eco", false) ?? true;
    const maxTokens: number = interaction.options.getInteger("tokens_maximos", false) ?? 4096;
    try
    {
        const content: string = await GetContent(url);
        const response = await openaiClient.chat.completions.create(
        {
            model: ecoMode ? "gpt-4o-mini" : "gpt-4o",
            temperature: 0,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            max_tokens: maxTokens,
            messages:
            [
                {
                    role: "system",
                    content: modelPrompt 
                },
                {
                    role: "user",
                    content
                },
            ]
        });
        await interaction.editReply(
        {
            content: `<${url}>${ecoMode ? "\n-# Modo eco" : ""}`,
            files: [new AttachmentBuilder(Buffer.from(response.choices[0].message.content!), { name: "body.asciidoc" })]
        });
    }
    catch (error)
    {
        console.log(error);
        await interaction.editReply("No se ha podido realizar la acción.\n-# Consulta la consola para más detalles");
    }
});

discordClient.login(process.env.DISCORD_TOKEN);
