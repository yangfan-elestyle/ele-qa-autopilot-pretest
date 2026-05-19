export interface PluginContext {
  text: string
}

export interface PluginResult extends PluginContext {
  errors?: Array<{
    plugin: string
    error: string
  }>
}

export interface ContentPlugin {
  name: string
  run(input: PluginContext): Promise<PluginResult>
}

export async function runPlugins(initial: PluginContext, plugins: ContentPlugin[]): Promise<PluginResult> {
  const result: PluginResult = { ...initial }

  for (const plugin of plugins) {
    try {
      const output = await plugin.run({ text: result.text })
      result.text = output.text

      // Merge errors from plugin output
      if (output.errors && output.errors.length > 0) {
        if (!result.errors) {
          result.errors = []
        }
        result.errors.push(...output.errors)
      }
    } catch (err: any) {
      if (!result.errors) {
        result.errors = []
      }
      result.errors.push({
        plugin: plugin.name,
        error: err?.message || String(err),
      })
      // continue to next plugin
    }
  }

  return result
}
