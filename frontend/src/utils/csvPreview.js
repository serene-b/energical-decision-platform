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
