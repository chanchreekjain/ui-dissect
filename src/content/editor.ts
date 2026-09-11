interface EditRecord {
  /** The element's inline style exactly as it was before UI Dissect touched it. */
  originalCssText: string;
  edits: Map<string, string>;
}

/**
 * Applies temporary style overrides to elements on the page.
 *
 * Overrides are written as inline styles with `!important` so they win over page
 * rules, and the element's original inline `cssText` is stored verbatim so a reset
 * restores it exactly. Nothing is persisted -- a page reload wipes every edit.
 */
export class LiveEditor {
  private records = new Map<HTMLElement, EditRecord>();

  private ensure(el: HTMLElement): EditRecord {
    let rec = this.records.get(el);
    if (!rec) {
      rec = { originalCssText: el.style.cssText, edits: new Map() };
      this.records.set(el, rec);
    }
    return rec;
  }

  public set(el: HTMLElement, prop: string, value: string): void {
    const rec = this.ensure(el);
    el.style.setProperty(prop, value, 'important');
    rec.edits.set(prop, value);
  }

  public setMany(el: HTMLElement, props: Record<string, string>): void {
    for (const [prop, value] of Object.entries(props)) {
      this.set(el, prop, value);
    }
  }

  public getEdits(el: HTMLElement): Record<string, string> {
    const rec = this.records.get(el);
    return rec ? Object.fromEntries(rec.edits) : {};
  }

  public isEdited(el: HTMLElement): boolean {
    const rec = this.records.get(el);
    return !!rec && rec.edits.size > 0;
  }

  /** How many distinct elements currently carry edits. */
  public editedCount(): number {
    let n = 0;
    for (const rec of this.records.values()) {
      if (rec.edits.size > 0) n++;
    }
    return n;
  }

  public reset(el: HTMLElement): void {
    const rec = this.records.get(el);
    if (!rec) return;
    restore(el, rec.originalCssText);
    this.records.delete(el);
  }

  public resetAll(): void {
    for (const [el, rec] of this.records) {
      restore(el, rec.originalCssText);
    }
    this.records.clear();
  }
}

/**
 * Puts the element's inline style back exactly as it was -- including dropping the
 * style attribute entirely if the element never had one.
 */
function restore(el: HTMLElement, originalCssText: string): void {
  if (originalCssText) {
    el.style.cssText = originalCssText;
  } else {
    el.removeAttribute('style');
  }
}
