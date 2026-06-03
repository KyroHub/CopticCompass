import {
  DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS,
  DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS,
  DICTIONARY_DIALECT_CODES,
  DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT,
} from "@/features/dictionary/config";

export function buildPublicOpenApiDictionarySchemas() {
  return {
    DictionaryDialectForms: {
      type: "object",
      properties: {
        absolute: {
          type: "string",
          example: "ⲙⲟⲓ",
        },
        nominal: {
          type: "string",
          example: "ⲙⲁ-",
        },
        pronominal: {
          type: "string",
          example: "ⲙⲏⲓ=",
        },
        stative: {
          type: "string",
          example: "",
        },
        participles: {
          type: "array",
          items: {
            type: "string",
          },
        },
        variants: {
          type: "object",
          properties: {
            absolute: {
              type: "array",
              items: {
                type: "string",
              },
            },
            nominal: {
              type: "array",
              items: {
                type: "string",
              },
            },
            pronominal: {
              type: "array",
              items: {
                type: "string",
              },
            },
            stative: {
              type: "array",
              items: {
                type: "string",
              },
            },
            constructParticiples: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    DictionaryDialectFormsMap: {
      type: "object",
      properties: {
        A: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        B: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        F: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        Fb: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        L: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        M: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        Sl: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        O: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        S: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        Sa: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
        Sf: {
          $ref: "#/components/schemas/DictionaryDialectForms",
        },
      },
      additionalProperties: false,
    },
    DictionaryLocalizedStringArrays: {
      type: "object",
      properties: {
        en: {
          type: "array",
          items: {
            type: "string",
          },
        },
        nl: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    DictionaryRelation: {
      type: "object",
      required: ["type", "targetId"],
      properties: {
        type: {
          type: "string",
          enum: ["CAUS_OF", "COMPOUND_WITH", "DERIVED_FROM", "SEE_ALSO"],
        },
        targetId: {
          type: "number",
          example: 13,
        },
        notes: {
          $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
        },
        targetEntry: {
          $ref: "#/components/schemas/DictionaryEntryReference",
        },
      },
      additionalProperties: false,
    },
    DictionaryRelations: {
      type: "array",
      items: {
        $ref: "#/components/schemas/DictionaryRelation",
      },
    },
    DictionarySense: {
      type: "object",
      required: ["grammar"],
      properties: {
        dialects: {
          description:
            "Dialect codes when the entire sense, not merely an alternate translation, is dialect-restricted.",
          type: "array",
          items: {
            type: "string",
            enum: [...DICTIONARY_DIALECT_CODES],
          },
        },
        grammar: {
          $ref: "#/components/schemas/DictionarySenseGrammar",
        },
        meanings: {
          $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
        },
        notes: {
          $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
        },
      },
      additionalProperties: false,
    },
    DictionarySenseGrammar: {
      type: "object",
      required: ["pos"],
      properties: {
        affix: {
          type: "string",
          enum: ["PFX", "SFX"],
        },
        caseRole: {
          type: "string",
          enum: ["DAT", "OBJ"],
        },
        complementizerGovernment: {
          description:
            "Canonical Coptic complementizers introducing clausal complements governed by this verb sense.",
          type: "array",
          items: {
            type: "string",
            enum: [...DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS],
          },
        },
        constructionGovernment: {
          description:
            "Canonical fixed constructions governed by this verb sense, especially comparative or as-constructions.",
          type: "array",
          items: {
            type: "string",
            enum: [...DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS],
          },
        },
        derivation: {
          type: "string",
          enum: ["CAUS"],
        },
        form: {
          type: "string",
          enum: ["ABS", "PC", "STA", "VBAL"],
        },
        gender: {
          type: "string",
          enum: ["BOTH", "F", "M"],
        },
        mood: {
          type: "string",
          enum: ["IMP"],
        },
        number: {
          type: "string",
          enum: ["PL", "SG"],
        },
        polarity: {
          type: "string",
          enum: ["NEG"],
        },
        pos: {
          type: "string",
          enum: [
            "V",
            "N",
            "ADJ",
            "ADV",
            "CONJ",
            "INTJ",
            "OTHER",
            "PREP",
            "UNKNOWN",
            "PRON",
          ],
        },
        prepGovernment: {
          description:
            "Dialect-aware prepositional government mapping dialect codes to lists of canonical Coptic prepositional forms.",
          type: "object",
          properties: {
            S: {
              type: "array",
              items: {
                type: "string",
                enum: [...DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.S],
              },
            },
            B: {
              type: "array",
              items: {
                type: "string",
                enum: [...DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.B],
              },
            },
          },
          additionalProperties: false,
        },
        tags: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "N",
              "V",
              "ADJ",
              "ADV",
              "CONJ",
              "PREP",
              "PRON",
              "INTR",
              "TR",
              "STA",
              "IMP",
              "PC",
              "REFL",
              "AUX",
              "IMPERS.V",
              "IMPERS",
              "PFX",
              "SFX",
              "DAT",
              "OBJ",
              "NEG",
              "INDF",
              "Q",
              "CAUS",
              "SIM",
              "REL",
              "PL",
              "SG",
              "LIT",
              "VBAL",
              "ESP",
              "ABS",
            ],
          },
        },
        valency: {
          type: "string",
          enum: ["INTR", "TR"],
        },
        voice: {
          type: "string",
          enum: ["REFL"],
        },
      },
      additionalProperties: false,
    },
    DictionarySenses: {
      description:
        "Ordered grammar-scoped senses. Display badges are derived from each sense's grammar object.",
      type: "array",
      items: {
        $ref: "#/components/schemas/DictionarySense",
      },
    },
    DictionaryDialectMeaning: {
      type: "object",
      required: ["sourceLabel", "dialects"],
      properties: {
        sourceLabel: {
          type: "string",
          example: "BS",
        },
        dialects: {
          type: "array",
          items: {
            type: "string",
            enum: ["A", "B", "F", "L", "M", "O", "S"],
          },
          example: ["B", "S"],
        },
        meanings: {
          $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
        },
        notes: {
          $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
        },
      },
      additionalProperties: false,
    },
    DictionaryGenderedMeaningValues: {
      type: "object",
      properties: {
        m: {
          type: "string",
          example: "male servant",
        },
        f: {
          type: "string",
          example: "female servant",
        },
        pl: {
          type: "string",
          example: "servants",
        },
      },
      additionalProperties: false,
    },
    DictionaryGenderedMeaning: {
      type: "object",
      properties: {
        meanings: {
          type: "object",
          properties: {
            en: {
              $ref: "#/components/schemas/DictionaryGenderedMeaningValues",
            },
            nl: {
              $ref: "#/components/schemas/DictionaryGenderedMeaningValues",
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    DictionaryInflectedFormDetails: {
      type: "object",
      required: ["form"],
      properties: {
        form: {
          type: "string",
          example: "ⲟⲩⲣⲱⲟⲩ",
        },
        entryId: {
          type: "number",
          example: 20,
        },
        notes: {
          type: "array",
          items: {
            type: "string",
          },
        },
        uncertain: {
          type: "boolean",
        },
      },
      additionalProperties: false,
    },
    DictionaryInflectedFormValue: {
      oneOf: [
        {
          type: "string",
          example: "ⲟⲩⲣⲱⲟⲩ",
        },
        {
          $ref: "#/components/schemas/DictionaryInflectedFormDetails",
        },
      ],
    },
    DictionaryInflectionRoleMap: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: {
          $ref: "#/components/schemas/DictionaryInflectedFormValue",
        },
      },
    },
    DictionaryInflectionDialectMap: {
      type: "object",
      additionalProperties: {
        $ref: "#/components/schemas/DictionaryInflectionRoleMap",
      },
    },
    DictionaryInflections: {
      type: "object",
      properties: {
        dual: {
          $ref: "#/components/schemas/DictionaryInflectionDialectMap",
        },
        feminine: {
          $ref: "#/components/schemas/DictionaryInflectionDialectMap",
        },
        imperative: {
          $ref: "#/components/schemas/DictionaryInflectionDialectMap",
        },
        masculine: {
          $ref: "#/components/schemas/DictionaryInflectionDialectMap",
        },
        plural: {
          $ref: "#/components/schemas/DictionaryInflectionDialectMap",
        },
      },
      additionalProperties: false,
    },
    DictionaryGreekContext: {
      type: "object",
      minProperties: 1,
      properties: {
        sources: {
          type: "array",
          minItems: 1,
          items: {
            type: "string",
          },
        },
        equivalents: {
          type: "array",
          minItems: 1,
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    DictionaryEntryReference: {
      type: "object",
      required: ["id", "headword", "dialects"],
      properties: {
        id: {
          type: "number",
          example: 2,
        },
        headword: {
          type: "string",
          example: "ϯ",
        },
        dialects: {
          $ref: "#/components/schemas/DictionaryDialectFormsMap",
        },
      },
      additionalProperties: false,
    },
    DictionaryClientEntry: {
      type: "object",
      required: ["id", "headword", "dialects", "senses", "etym"],
      properties: {
        id: {
          type: "number",
          example: 2,
        },
        headword: {
          type: "string",
          example: "ⲙⲟⲓ",
        },
        dialects: {
          $ref: "#/components/schemas/DictionaryDialectFormsMap",
        },
        greekContext: {
          $ref: "#/components/schemas/DictionaryGreekContext",
        },
        senses: {
          $ref: "#/components/schemas/DictionarySenses",
        },
        dialectMeanings: {
          type: "array",
          items: {
            $ref: "#/components/schemas/DictionaryDialectMeaning",
          },
        },
        genderedMeanings: {
          type: "array",
          items: {
            $ref: "#/components/schemas/DictionaryGenderedMeaning",
          },
        },
        etym: {
          type: "string",
          enum: ["Egy", "Gr", "Lat", "Sem", "Unknown"],
        },
        inflections: {
          $ref: "#/components/schemas/DictionaryInflections",
        },
        relations: {
          $ref: "#/components/schemas/DictionaryRelations",
        },
      },
      additionalProperties: false,
    },
    DictionarySearchPage: {
      type: "object",
      required: [
        "entries",
        "hasMore",
        "limit",
        "nextOffset",
        "offset",
        "totalEntries",
        "totalMatches",
      ],
      properties: {
        entries: {
          type: "array",
          items: {
            $ref: "#/components/schemas/DictionaryClientEntry",
          },
        },
        hasMore: {
          type: "boolean",
        },
        limit: {
          type: "integer",
        },
        nextOffset: {
          type: "integer",
          nullable: true,
        },
        offset: {
          type: "integer",
        },
        totalEntries: {
          type: "integer",
        },
        totalMatches: {
          type: "integer",
        },
      },
      additionalProperties: false,
    },
  };
}
