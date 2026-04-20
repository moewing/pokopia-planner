/**
 * Pokopia 扩展字段补全脚本
 * 
 * 用途：遍历 pokopiamap.com 每只宝可梦的详情页，抽取以下字段补齐到 pokemon.json：
 *   - type (属性)
 *   - time_of_day (出现时段)
 *   - weather (出现天气)  
 *   - habitats (推荐栖息地名称)
 * 
 * 运行方式：
 *   cd scripts && pnpm tsx scrape_pokopiamap.ts
 * 
 * 依赖：
 *   npm install cheerio undici
 * 
 * 注意事项：
 *   1. 限速：每次请求间隔 1-2 秒，避免被封
 *   2. 重试：失败自动重试 3 次
 *   3. 断点续跑：把已完成的 id 写入 progress.json，重跑时跳过
 *   4. pokopiamap 的 id 范围是 1~307（含地区形态和活动宝可梦）
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { load } from 'cheerio';
import { fetch } from 'undici';

const POKEDEX_URL = (id: number) => `https://pokopiamap.com/zh/pokedex/${id}`;
const MAX_ID = 307;
const DELAY_MS = 1500;  // 每次请求间隔
const MAX_RETRIES = 3;

interface PokemonExt {
  id: number;
  type: string[];
  time_of_day: string[];
  weather: string[];
  habitats: string[];
  // 可选:顺便把 pokopiamap 的特长名也抓下来,对照 PDF
  specialties_from_pokopiamap: string[];
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PokopiaPlannerBot/1.0)',
        },
      });
      if (res.ok) return await res.text();
      console.warn(`[${url}] status ${res.status}, retry ${i+1}/${retries}`);
    } catch (e) {
      console.warn(`[${url}] fetch error`, e);
    }
    await sleep(DELAY_MS * (i + 1));
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

function parsePokemonPage(html: string, id: number): PokemonExt | null {
  const $ = load(html);
  
  // 出现条件区块
  const spawnBlock = $('h2:contains("出现条件")').next();
  
  // 属性: "属性 : 草 / 毒"
  const typeRaw = $('dt:contains("属性")').next('dd').text().trim();
  const types = typeRaw.split(/[\/、,，]/).map(s => s.trim()).filter(Boolean);
  
  // 特长: "特长 : 生长、掉落"
  const specialtiesRaw = $('dt:contains("特长")').next('dd').text().trim();
  const specialties = specialtiesRaw.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  
  // 时段: "推荐时段 : 全天" or "清晨、白天、黄昏"
  const timeRaw = $('dt:contains("推荐时段")').next('dd').text().trim();
  let time_of_day: string[] = [];
  if (timeRaw === '全天') {
    time_of_day = ['清晨', '白天', '黄昏', '夜晚'];
  } else {
    time_of_day = timeRaw.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  }
  
  // 天气
  const weatherRaw = $('dt:contains("天气")').next('dd').text().trim();
  const weather = weatherRaw.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  
  // 推荐栖息地: "推荐栖息地 : 乘风暖流区、玩偶中心、玩偶床位"
  const habitatsRaw = $('dt:contains("推荐栖息地")').next('dd').text().trim();
  const habitats = habitatsRaw.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  
  if (types.length === 0 && specialties.length === 0) {
    console.warn(`[id=${id}] parsed empty data, page may have changed layout`);
    return null;
  }
  
  return {
    id,
    type: types,
    specialties_from_pokopiamap: specialties,
    time_of_day,
    weather,
    habitats,
  };
}

async function main() {
  // 加载现有数据
  const dataPath = '../data/pokemon.json';
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  // 加载进度
  const progressPath = './progress.json';
  const progress: Record<number, PokemonExt> = existsSync(progressPath)
    ? JSON.parse(readFileSync(progressPath, 'utf-8'))
    : {};
  
  console.log(`Resuming from ${Object.keys(progress).length} already-scraped records`);
  
  for (let id = 1; id <= MAX_ID; id++) {
    if (progress[id]) {
      continue;  // 已抓过
    }
    
    try {
      console.log(`Fetching #${id}...`);
      const html = await fetchWithRetry(POKEDEX_URL(id));
      const ext = parsePokemonPage(html, id);
      
      if (ext) {
        progress[id] = ext;
        writeFileSync(progressPath, JSON.stringify(progress, null, 2));
        console.log(`  ✓ ${ext.type.join('/')} | ${ext.specialties_from_pokopiamap.join('、')} | ${ext.habitats.length} habitats`);
      }
    } catch (e) {
      console.error(`Failed #${id}:`, e);
    }
    
    await sleep(DELAY_MS);
  }
  
  // 合并回主数据
  for (const record of data.pokemon) {
    const ext = progress[record.id];
    if (ext) {
      record.type = ext.type;
      record.time_of_day = ext.time_of_day;
      record.weather = ext.weather;
      record.habitats = ext.habitats;
      // 把 pokopiamap 的特长写入 notes(便于后续校对)
      if (ext.specialties_from_pokopiamap.length > 0) {
        const pokopiamapSpec = ext.specialties_from_pokopiamap.join('/');
        const pdfSpec = record.specialties.join('/');
        if (pokopiamapSpec !== pdfSpec) {
          record.notes = record.notes || [];
          record.notes.push(`pokopiamap 特长: ${pokopiamapSpec} (vs PDF: ${pdfSpec})`);
        }
      }
    }
  }
  
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`\nDone! Updated ${Object.keys(progress).length} records in ${dataPath}`);
}

main().catch(console.error);
