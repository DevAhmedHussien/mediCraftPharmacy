import { db } from "@/lib/db";
async function main() {
  const demo = await db.product.findMany({ where: { description: { not: null } }, select: { id: true } });
  const ids = demo.map((d) => d.id);
  console.log("LOCAL database");
  console.log(`  non-spreadsheet products  : ${demo.length}`);
  console.log(`  non-spreadsheet categories: ${await db.productCategory.count({ where: { isActive: false } })}`);
  console.log("  references deleting would break:");
  console.log(`    PriceListItem             ${await db.priceListItem.count({ where: { productId: { in: ids } } })}`);
  console.log(`    PartnerPricing            ${await db.partnerPricing.count({ where: { productId: { in: ids } } })}`);
  console.log(`    PartnerFormularySelection ${await db.partnerFormularySelection.count({ where: { productId: { in: ids } } })}`);
  console.log(`    AmendmentItem             ${await db.amendmentItem.count({ where: { productId: { in: ids } } })}`);
  console.log(`  partners in this database : ${await db.partner.count()}`);
  await db.$disconnect();
}
main();
