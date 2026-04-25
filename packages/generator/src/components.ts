import type { Component } from './component.ts'

export class Components extends Map<string, Component> {
  private names: Record<string, Component | true> = {}

  constructor(private root: string) {
    super()
  }

  set(name: string, value: Component) {
    super.set(name, value)
    this.computeName(value)

    return this
  }

  toSchemas() {
    return Object.fromEntries(
      this.values().map((item) => [item.name!, item.schema]),
    )
  }

  private computeName(schema: Component) {
    for (const name of schema.reference.lookupName(this.root)) {
      const existing = this.names[name]

      if (!existing) {
        this.names[name] = schema
        schema.name = name
        return
      }

      if (existing !== true) {
        this.names[name] = true
        this.computeName(existing)
      }
    }
  }
}
