type PromptTemplateValue = string | number | boolean | null | undefined;

type PromptTemplateValues = Readonly<Record<string, PromptTemplateValue>>;

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

export class PromptTemplate<TVariables extends PromptTemplateValues = PromptTemplateValues> {
  private readonly template: string;

  private constructor(template: string) {
    this.template = template;
  }

  static fromTemplate<TVariables extends PromptTemplateValues>(
    template: string,
  ): PromptTemplate<TVariables> {
    return new PromptTemplate<TVariables>(template);
  }

  async format(values: TVariables): Promise<string> {
    return this.template.replace(
      PLACEHOLDER_PATTERN,
      (_placeholder: string, variableName: string): string => {
        if (!(variableName in values)) {
          throw new Error(`Missing prompt variable: ${variableName}`);
        }

        const value = values[variableName as keyof TVariables];
        if (value === null || value === undefined) {
          return "";
        }

        return String(value);
      },
    );
  }
}
