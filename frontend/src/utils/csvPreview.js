function countDelimiter(record, delimiter) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];
    if (character === '"') {
      if (inQuotes && record[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

function firstCsvRecord(value) {
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && (character === "\n" || character === "\r")) {
      return value.slice(0, index);
    }
  }

  return value;
}

export const SUPPORTED_DATASETS = ["transactions", "orders", "customers", "catalogue"];

const DATASET_HEADER_ALIASES = {
  "order id stage": "order_id_stage",
  "customer id stage": "customer_id_stage",
  "code client": "customer_id_stage",
  "quantity": "quantity",
  "line total": "line_total",
  "order total amount": "order_total_amount",
  "orders count": "orders_count",
  "total amount": "total_amount",
  "sku": "sku",
  "product name": "product_name",
  "nom": "product_name",
  "category": "category",
  "categorie": "category",
};

function canonicalDetectionHeader(value) {
  const normalized = String(value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  return DATASET_HEADER_ALIASES[normalized] || normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function detectDatasetFromHeaders(headers = []) {
  const keys = new Set(headers.map(canonicalDetectionHeader));
  if (["order_id_stage", "quantity", "line_total"].every((column) => keys.has(column))) {
    return { status: "detected", dataset: "transactions" };
  }
  if (["order_id_stage", "order_total_amount"].every((column) => keys.has(column))) {
    return { status: "detected", dataset: "orders" };
  }
  if (["customer_id_stage", "orders_count", "total_amount"].every((column) => keys.has(column))) {
    return { status: "detected", dataset: "customers" };
  }
  if (keys.has("sku") && (keys.has("product_name") || keys.has("category"))) {
    return { status: "detected", dataset: "catalogue" };
  }
  return { status: "needs_identification", dataset: "" };
}

export function parseCsvPreview(source, previewLimit = 5) {
  const value = source.replace(/^\uFEFF/, "");
  const firstRecord = firstCsvRecord(value);
  const delimiter = countDelimiter(firstRecord, ";") > countDelimiter(firstRecord, ",") ? ";" : ",";
  const parsedRows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  const commitRow = () => {
    currentRow.push(currentValue);
    if (currentRow.some((field) => field.trim() !== "")) {
      parsedRows.push(currentRow);
    }
    currentRow = [];
    currentValue = "";
  };

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '"') {
      if (inQuotes && value[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter) {
      currentRow.push(currentValue);
      currentValue = "";
    } else if (!inQuotes && (character === "\n" || character === "\r")) {
      commitRow();
      if (character === "\r" && value[index + 1] === "\n") index += 1;
    } else {
      currentValue += character;
    }
  }

  if (inQuotes) {
    throw new Error("Unclosed quoted field");
  }

  if (currentValue.length || currentRow.length) commitRow();

  if (!parsedRows.length) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      duplicateRows: 0,
      missingValues: 0,
      malformedRows: 0,
      delimiter,
    };
  }

  const headers = parsedRows[0].map((header) => header.trim());
  const dataRows = parsedRows.slice(1);
  const fingerprints = new Set();
  let duplicateRows = 0;
  let missingValues = 0;
  let malformedRows = 0;

  dataRows.forEach((row) => {
    const fingerprint = JSON.stringify(row);
    if (fingerprints.has(fingerprint)) duplicateRows += 1;
    fingerprints.add(fingerprint);

    if (row.length !== headers.length) malformedRows += 1;
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      if ((row[columnIndex] || "").trim() === "") missingValues += 1;
    }
  });

  return {
    headers,
    rows: dataRows.slice(0, previewLimit),
    rowCount: dataRows.length,
    columnCount: headers.length,
    duplicateRows,
    missingValues,
    malformedRows,
    delimiter,
  };
}
