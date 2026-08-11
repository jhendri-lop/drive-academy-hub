import { SQLiteClient } from "../SQLiteClient";

export interface SchoolConfigData {
  schoolName: string;
  ruc: string;
  branch: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  resolutionAuth: string;
  logoPath: string;
  directorName: string;
  directorTitle: string;
  secretaryName: string;
  secretaryTitle: string;
  antDirectorName: string;
  antDirectorTitle: string;
  legalRepName: string;
  legalRepTitle: string;
  receiptStartNumber: number;
  actaStartNumber: number;
  oficioStartNumber: number;
  prices: Record<string, number>;
  themeMode: string;
  themeColor: string;
}

export class SQLiteConfigRepository {
  private client = SQLiteClient.getInstance();

  public async getConfig(): Promise<SchoolConfigData> {
    const row = this.client.queryOne(`SELECT * FROM school_config WHERE id = 1`);
    if (!row) {
      return {
        schoolName: "Zentriumph-DriveOfice",
        ruc: "1791234567001",
        branch: "Matriz",
        address: "Av. Amazonas N34-120",
        city: "Quito",
        phone: "02 250 4477",
        email: "info@zentriumph.ec",
        resolutionAuth: "018-DE-DCTS-ANT-2013",
        logoPath: "/logo.jpg",
        directorName: "Ing. Marco Villacís",
        directorTitle: "Director de Escuelas",
        secretaryName: "Lcda. Andrea Suárez",
        secretaryTitle: "Secretaria Académica",
        antDirectorName: "Dr. Luis Paredes",
        antDirectorTitle: "Director Provincial",
        legalRepName: "Sr. Jorge Bastidas",
        legalRepTitle: "Representante Legal",
        receiptStartNumber: 1001,
        actaStartNumber: 200,
        oficioStartNumber: 350,
        prices: { B: 420, C: 560, D: 680, E: 780, F: 500, Psicosensometrico: 35 },
        themeMode: "dark",
        themeColor: "blue",
      };
    }

    return {
      schoolName: row.school_name,
      ruc: row.ruc,
      branch: row.branch || "Matriz",
      address: row.address,
      city: row.city || "Quito",
      phone: row.phone || "",
      email: row.email || "",
      resolutionAuth: row.resolution_auth || "",
      logoPath: row.logo_path || "",
      directorName: row.director_name || "",
      directorTitle: row.director_title || "",
      secretaryName: row.secretary_name || "",
      secretaryTitle: row.secretary_title || "",
      antDirectorName: row.ant_director_name || "",
      antDirectorTitle: row.ant_director_title || "",
      legalRepName: row.legal_rep_name || "",
      legalRepTitle: row.legal_rep_title || "",
      receiptStartNumber: row.receipt_start_number || 1001,
      actaStartNumber: row.acta_start_number || 200,
      oficioStartNumber: row.oficio_start_number || 350,
      prices: {
        B: row.price_type_b || 420,
        C: row.price_type_c || 560,
        D: row.price_type_d || 680,
        E: row.price_type_e || 780,
        F: row.price_type_f || 500,
        Psicosensometrico: row.price_psicosensometrico || 35,
      },
      themeMode: row.theme_mode || "dark",
      themeColor: row.theme_color || "blue",
    };
  }

  public async updateConfig(updates: Partial<SchoolConfigData>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.schoolName !== undefined) { fields.push("school_name = ?"); params.push(updates.schoolName); }
    if (updates.ruc !== undefined) { fields.push("ruc = ?"); params.push(updates.ruc); }
    if (updates.address !== undefined) { fields.push("address = ?"); params.push(updates.address); }
    if (updates.phone !== undefined) { fields.push("phone = ?"); params.push(updates.phone); }
    if (updates.email !== undefined) { fields.push("email = ?"); params.push(updates.email); }
    if (updates.directorName !== undefined) { fields.push("director_name = ?"); params.push(updates.directorName); }
    if (updates.secretaryName !== undefined) { fields.push("secretary_name = ?"); params.push(updates.secretaryName); }

    if (fields.length > 0) {
      params.push(1);
      await this.client.execute(`UPDATE school_config SET ${fields.join(", ")} WHERE id = ?`, params);
    }
  }

  public async getPrices(): Promise<Record<string, number>> {
    const cfg = await this.getConfig();
    return cfg.prices;
  }

  public async updatePrices(prices: Record<string, number>): Promise<void> {
    const sql = `
      UPDATE school_config SET
        price_type_b = ?,
        price_type_c = ?,
        price_type_d = ?,
        price_type_e = ?,
        price_type_f = ?,
        price_psicosensometrico = ?
      WHERE id = 1;
    `;
    const params = [
      prices["B"] ?? 420,
      prices["C"] ?? 560,
      prices["D"] ?? 680,
      prices["E"] ?? 780,
      prices["F"] ?? 500,
      prices["Psicosensometrico"] ?? 35,
    ];
    await this.client.execute(sql, params);
  }
}
