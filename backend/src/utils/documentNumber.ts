import { DocumentType, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const PREFIX: Record<DocumentType, string> = {
  QUOTATION: 'QT',
  INVOICE: 'INV',
  BILL: 'BILL',
};

export async function nextDocumentNumber(
  documentType: DocumentType,
  tx: Prisma.TransactionClient = prisma,
): Promise<string> {
  const year = new Date().getFullYear();

  const existing = await tx.documentSequence.findUnique({
    where: { documentType },
  });

  let next: number;

  if (!existing) {
    await tx.documentSequence.create({
      data: { documentType, year, lastNumber: 1 },
    });
    next = 1;
  } else if (existing.year !== year) {
    await tx.documentSequence.update({
      where: { documentType },
      data: { year, lastNumber: 1 },
    });
    next = 1;
  } else {
    const updated = await tx.documentSequence.update({
      where: { documentType },
      data: { lastNumber: { increment: 1 } },
    });
    next = updated.lastNumber;
  }

  return `${PREFIX[documentType]}-${year}-${String(next).padStart(4, '0')}`;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcGst(subtotal: number, gstPercent: number) {
  const gstAmount = roundMoney((subtotal * gstPercent) / 100);
  const total = roundMoney(subtotal + gstAmount);
  return { gstAmount, total };
}

export function toNumber(value: Prisma.Decimal | number | string): number {
  return Number(value);
}
