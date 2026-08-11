import Fuse, { type IFuseOptions } from "fuse.js";

export interface SearchableItem {
  id: string;
  type: "estudiante" | "curso";
  fullName: string;
  cedula: string;
  courseName: string;
  phone: string;
  email: string;
  original: any;
}

const fuseOptions: IFuseOptions<SearchableItem> = {
  keys: [
    { name: "fullName", weight: 0.4 },
    { name: "cedula", weight: 0.3 },
    { name: "courseName", weight: 0.15 },
    { name: "phone", weight: 0.1 },
    { name: "email", weight: 0.05 },
  ],
  threshold: 0.4, // Tolerancia difusa ("Kevn" -> "Kevin")
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
};

export class FuzzySearchService {
  private static instance: FuzzySearchService | null = null;
  private fuse: Fuse<SearchableItem> | null = null;
  private items: SearchableItem[] = [];

  private constructor() {}

  public static getInstance(): FuzzySearchService {
    if (!FuzzySearchService.instance) {
      FuzzySearchService.instance = new FuzzySearchService();
    }
    return FuzzySearchService.instance;
  }

  public setDataset(estudiantes: any[], cursos: any[]): void {
    const cursoMap = new Map<string, string>();
    cursos.forEach((c) => cursoMap.set(c.id, c.nombre || c.courseName || ""));

    const studentItems: SearchableItem[] = estudiantes.map((e) => ({
      id: e.id,
      type: "estudiante",
      fullName: e.nombres || e.fullName || "",
      cedula: e.cedula || "",
      courseName: cursoMap.get(e.cursoId || e.courseId) || "",
      phone: e.celular || e.phone || "",
      email: e.correo || e.email || "",
      original: e,
    }));

    const courseItems: SearchableItem[] = cursos.map((c) => ({
      id: c.id,
      type: "curso",
      fullName: "",
      cedula: "",
      courseName: c.nombre || c.courseName || "",
      phone: "",
      email: "",
      original: c,
    }));

    this.items = [...studentItems, ...courseItems];
    this.fuse = new Fuse(this.items, fuseOptions);
  }

  public search(query: string): SearchableItem[] {
    if (!query || query.trim().length < 2) return [];
    if (!this.fuse) return [];
    const results = this.fuse.search(query.trim());
    return results.map((r) => r.item);
  }
}
