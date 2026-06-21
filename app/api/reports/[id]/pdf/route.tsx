import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadReportPdf } from "@/lib/storage"
import { ReportDocument } from "@/lib/pdf/report-document"

import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const scopeId = getScopeId(session)
  const { id } = await params
  const report = await prisma.clientReport.findFirst({
    where: { id, userId: scopeId },
    include: { campaign: { select: { name: true } } },
  })
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { agencyName: true, agencyLogo: true, brandColor: true },
  })

  const buffer = await renderToBuffer(
    <ReportDocument
      agencyName={user?.agencyName ?? null}
      agencyLogo={user?.agencyLogo ?? null}
      brandColor={user?.brandColor ?? null}
      campaignName={report.campaign.name}
      periodStart={report.periodStart}
      periodEnd={report.periodEnd}
      metrics={report.metricsJson as Record<string, number | string>}
      narrative={report.aiNarrative}
      generatedAt={new Date()}
    />
  )

  const pdfUrl = await uploadReportPdf(Buffer.from(buffer), scopeId, report.id)

  const updated = await prisma.clientReport.update({ where: { id }, data: { pdfUrl } })

  return NextResponse.json({ pdfUrl: updated.pdfUrl })
}
