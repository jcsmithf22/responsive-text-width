export type Unit = "px" | "em" | "rem" | "%" | "vw" | "vh" | "ch" | ""

export interface ValueWithUnit {
  value: number
  unit: Unit
}

export interface SpacingWithUnit {
  top: ValueWithUnit
  right: ValueWithUnit
  bottom: ValueWithUnit
  left: ValueWithUnit
}
