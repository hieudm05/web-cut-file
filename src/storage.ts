import { openDB } from 'idb'
import type { Config } from './types'
const db = () => openDB('excel-report-manager',1,{upgrade(database){database.createObjectStore('settings')}})
export async function loadConfig(): Promise<Config | undefined> { const saved = await (await db()).get('settings','config') as Config | undefined; return saved ? { ...emptyConfig(), ...saved } : undefined }
export async function saveConfig(config: Config) { await (await db()).put('settings',JSON.parse(JSON.stringify(config)) as Config,'config') }
export const emptyConfig = (): Config => ({ version:1, columns:[], categories:[], groups:[], brands:[], folderName:'BaoCaoHanhTrinh', mainPattern:'main_{start}_{end}', groupPattern:'{group}_{shortStart}_{shortEnd}', folderPattern:'{folder}_{shortStart}_{shortEnd}', exportMode:'flexible', groupRowHeight:120 })
