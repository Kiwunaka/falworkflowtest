export interface FalModel {
  endpoint_id: string;
  metadata: {
    display_name: string;
    category: string;
    description: string;
    status: string;
    tags: string[];
    updated_at: string;
    is_favorited: boolean;
    thumbnail_url: string;
    model_url: string;
    date: string;
    highlighted: boolean;
    pinned: boolean;
  };
  openapi?: Record<string, unknown>;
}

export interface ModelsResponse {
  models: FalModel[];
  next_cursor: string | null;
  has_more: boolean;
}

export type ModelCategory =
  | "text-to-image"
  | "image-to-image"
  | "image-to-video"
  | "text-to-video"
  | "video-to-video"
  | "text-to-audio"
  | "text-to-speech"
  | "audio-to-audio"
  | "video-to-audio"
  | "training";

export const CATEGORY_LABELS: Record<string, string> = {
  "text-to-image": "Текст → Изображение",
  "image-to-image": "Изображение → Изображение",
  "image-to-video": "Изображение → Видео",
  "text-to-video": "Текст → Видео",
  "video-to-video": "Видео → Видео",
  "text-to-audio": "Текст → Аудио",
  "text-to-speech": "Текст → Речь",
  "audio-to-audio": "Аудио → Аудио",
  "video-to-audio": "Видео → Аудио",
  "training": "Обучение",
};

export const CATEGORY_ICONS: Record<string, string> = {
  "text-to-image": "🖼️",
  "image-to-image": "✏️",
  "image-to-video": "🎬",
  "text-to-video": "📹",
  "video-to-video": "🔄",
  "text-to-audio": "🎵",
  "text-to-speech": "🗣️",
  "audio-to-audio": "🎧",
  "video-to-audio": "🔊",
  "training": "🎓",
};

// Extract input fields from OpenAPI schema for dynamic form building
export interface ModelField {
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "file";
  description?: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  format?: string;
}

export function extractFieldsFromSchema(
  openapi: Record<string, unknown>
): ModelField[] {
  try {
    const paths = openapi.paths as Record<string, unknown>;
    if (!paths) return [];

    // Resolve $ref, allOf, anyOf, oneOf
    const resolve = (obj: any): any => {
      if (!obj) return obj;
      if (obj["$ref"]) {
        const ref = obj["$ref"] as string;
        const parts = ref.split("/");
        if (parts[0] === "#" && parts[1] === "components") {
          const type = parts[2];
          const name = parts[parts.length - 1];
          const components = openapi.components as any;
          const section = components?.[type];
          return resolve(section?.[name]);
        }
      }
      if (obj.allOf && Array.isArray(obj.allOf)) {
        const merged = { ...obj, properties: { ...(obj.properties || {}) } };
        obj.allOf.forEach((sub: any) => {
          const resolvedSub = resolve(sub);
          if (resolvedSub && resolvedSub.properties) {
            merged.properties = {
              ...merged.properties,
              ...resolvedSub.properties,
            };
          }
        });
        return merged;
      }
      if (obj.anyOf && Array.isArray(obj.anyOf)) {
        // Find the first option that has a type or properties, typically the non-null one
        const realOption = obj.anyOf.find((o: any) => {
          const r = resolve(o);
          return r && (r.type || r.properties || r.enum);
        });
        if (realOption) {
          return { ...obj, ...resolve(realOption) };
        }
      }
      if (obj.oneOf && Array.isArray(obj.oneOf)) {
        const realOption = obj.oneOf.find((o: any) => {
          const r = resolve(o);
          return r && (r.type || r.properties || r.enum);
        });
        if (realOption) {
          return { ...obj, ...resolve(realOption) };
        }
      }
      return obj;
    };

    // Find the generation endpoint (one with POST and requestBody)
    let postOp: any = null;
    for (const pathObjRaw of Object.values(paths) as any[]) {
      const pathObj = resolve(pathObjRaw);
      const op = resolve(pathObj?.post);
      if (op && op.requestBody) {
        postOp = op;
        break;
      }
    }
    if (!postOp) {
      console.warn("No POST endpoint with requestBody found in schema");
      return [];
    }

    const requestBody = resolve(postOp.requestBody) as Record<string, unknown>;
    const content = requestBody?.content as Record<string, unknown>;
    const jsonContent = content?.["application/json"] as Record<string, unknown>;
    let schema = resolve(jsonContent?.schema) as Record<string, unknown>;
    if (!schema) return [];

    // Ensure we have properties either directly or via allOf
    if (!schema.properties && schema.allOf) {
      schema = resolve(schema);
    }

    if (!schema || !schema.properties) {
      console.warn("Resolved schema has no properties:", schema);
      return [];
    }

    const properties = schema.properties as Record<
      string,
      Record<string, unknown>
    >;
    const required = (schema.required as string[]) || [];

    const fields: ModelField[] = [];
    for (const [name, propRaw] of Object.entries(properties)) {
      const prop = resolve(propRaw);
      const type = prop.type as string;
      const format = prop.format as string;

      let fieldType: ModelField["type"] = "string";
      if (type === "number" || type === "integer") fieldType = type;
      else if (type === "boolean") fieldType = "boolean";
      else if (
        format === "binary" ||
        format === "uri" ||
        name.includes("_url") ||
        name.endsWith("image")
      )
        fieldType = "file";

      fields.push({
        name,
        type: fieldType,
        description: prop.description as string | undefined,
        required: required.includes(name),
        default: prop.default,
        enum: prop.enum as string[] | undefined,
        minimum: prop.minimum as number | undefined,
        maximum: prop.maximum as number | undefined,
        format,
      });
    }

    return fields;
  } catch (e) {
    console.error("Error extracting fields:", e);
    return [];
  }
}
