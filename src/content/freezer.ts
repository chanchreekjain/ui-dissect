export class StateFreezer {
  private frozen = false;

  public isFrozen(): boolean {
    return this.frozen;
  }

  public freeze(): void {
    this.frozen = true;
  }

  public unfreeze(): void {
    this.frozen = false;
  }

  public toggle(): boolean {
    this.frozen = !this.frozen;
    return this.frozen;
  }
}
