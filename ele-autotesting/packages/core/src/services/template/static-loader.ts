import { Template } from './types'
import { ALL_TEMPLATES } from './default-templates'

/**
 * 静态模板加载器 - 单语版（中文）
 */

export type TemplateType = 'optimize' | 'iterate' | 'user-optimize'

export interface StaticTemplateCollection {
  all: Record<string, Template>
  byType: Record<TemplateType, Record<string, Template>>
}

export class StaticLoader {
  private static templateCache: StaticTemplateCollection | null = null

  public isSupported(): boolean {
    return true
  }

  public loadTemplates(): StaticTemplateCollection {
    if (StaticLoader.templateCache) {
      return StaticLoader.templateCache
    }

    try {
      console.log(`🔄 静态导入开始加载模板...`)

      const all: Record<string, Template> = {}
      const byType: Record<TemplateType, Record<string, Template>> = {
        optimize: {},
        iterate: {},
        'user-optimize': {},
      }

      Object.values(ALL_TEMPLATES).forEach((template) => {
        const { id, metadata } = template
        const { templateType } = metadata

        const normalizedType: TemplateType = templateType === 'userOptimize' ? 'user-optimize' : (templateType as TemplateType)

        all[id] = template
        if (template.isBuiltin) {
          byType[normalizedType][id] = template
        }
      })

      const result: StaticTemplateCollection = { all, byType }

      console.log(`✅ 成功加载 ${Object.keys(all).length} 个模板`, {
        总数: Object.keys(all).length,
        optimize: Object.keys(byType.optimize).length,
        iterate: Object.keys(byType.iterate).length,
        'user-optimize': Object.keys(byType['user-optimize']).length,
      })

      StaticLoader.templateCache = result
      return result
    } catch (error) {
      console.error('❌ 静态导入加载模板失败:', error)
      throw new Error(`Failed to load static templates: ${error}`)
    }
  }

  public getTemplatesByType(type: TemplateType): Record<string, Template> {
    const collection = this.loadTemplates()
    return collection.byType[type]
  }

  public getAllTemplateIds(): string[] {
    const collection = this.loadTemplates()
    return Object.keys(collection.all)
  }

  public getDefaultTemplates(): Record<string, Template> {
    const collection = this.loadTemplates()
    const result: Record<string, Template> = {}
    Object.values(collection.byType).forEach((typeBucket) => {
      Object.assign(result, typeBucket)
    })
    return result
  }

  public getLoaderStatus() {
    const collection = this.loadTemplates()
    return {
      isSupported: this.isSupported(),
      totalTemplates: Object.keys(collection.all).length,
    }
  }

  public reloadTemplates(): Record<string, Template> {
    StaticLoader.templateCache = null
    return this.getDefaultTemplates()
  }
}

const staticLoader = new StaticLoader()

export { staticLoader }
