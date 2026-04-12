import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const samplesWithPdfRows = await prisma.sample.findMany({
          where: { reportPdfUrl: { not: null } },
          select: { id: true }
        });
        const samplesWithPdf = new Set(samplesWithPdfRows.map(s => s.id));

        const samples = await prisma.sample.findMany({
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true, barcode: true, clientId: true, clientName: true,
            phone: true, email: true, content: true, consultation: true,
            status: true, location: true, testStartDate: true, testEndDate: true,
            testLocation: true, testType: true, testAddress: true, bizNo: true,
            target: true, testProduct: true, testPurpose: true, testMethod: true,
            extra: true, testerBarcode: true, formalBarcode: true,
            bizLicenseUrl: true,
            gapjiApproved: true, euljiApproved: true,
            gapjiRejection: true, euljiRejection: true, receivedAt: true,
            estFees: true, advAmt: true, advDate: true, interimAmt: true, interimDate: true, finalAmt: true, finalDate: true,
            advPaidAmt: true, advPaidDate: true, interimPaidAmt: true, interimPaidDate: true, finalPaidAmt: true, finalPaidDate: true,
            isDepositCompleted: true,
            consultations: {
              orderBy: { createdAt: 'desc' }
            },
            invoice: { include: { items: true } },
            tests: { include: { tester: true } }
          }
        });
        const mappedSamples = samples.map(s => ({
          ...s,
          reportPdfUrl: samplesWithPdf.has(s.id) ? `/api/report-pdf?id=${s.id}` : null
        }));
        return res.status(200).json(mappedSamples);
      } catch (error) {
        return res.status(500).json({ message: '리스트 조회 중 오류 발생', error: error.message });
      }

    case 'POST':
      try {
        const { client, clientName, phone, email, bizNo, target, extra } = req.body;
        
        // barcode 생성 logic (KAIC-YY-SEQ)
        const today = new Date();
        const yy = String(today.getFullYear()).slice(2);
        const prefix = `KAIC-${yy}-`;
        const count = await prisma.sample.count({
          where: { barcode: { startsWith: prefix } }
        });
        const seq = String(count + 1).padStart(3, '0');
        const barcode = `${prefix}${seq}`;

        const newSample = await prisma.sample.create({
          data: {
            barcode,
            clientId: client,
            clientName,
            phone,
            email,
            bizNo,
            target,
            extra,
            status: 'RECEIVED'
          },
          select: { id: true, barcode: true, clientId: true, status: true }
        });
        const { reportPdfUrl: _, ...safeResponse } = newSample;
        return res.status(201).json(safeResponse);
      } catch (error) {
        return res.status(500).json({ message: '등록 중 오류 발생', error: error.message });
      }

    case 'PATCH':
      try {
        const { id, testerId, status, testStartDate, testEndDate, testLocation, testType, testAddress, reportPdfUrl, bizLicenseUrl, consultation, testProduct, testPurpose, testMethod, extra,
          estFees, advAmt, advDate, interimAmt, interimDate, finalAmt, finalDate,
          advPaidAmt, advPaidDate, interimPaidAmt, interimPaidDate, finalPaidAmt, finalPaidDate, isDepositCompleted
        } = req.body;
        
        // Update sample status and generate testerBarcode if needed
        const sample = await prisma.sample.findUnique({ where: { id } });
        let testerBarcode = sample.testerBarcode;

        if (testerId && !testerBarcode) {
          const user = await prisma.user.findUnique({ where: { id: testerId } });
          if (user) {
            testerBarcode = `${sample.barcode}_${user.id}`;
          } else {
            console.error(`[API Error] User not found during testerBarcode generation: ${testerId}`);
          }
        }

        const updatedData = { 
             testerBarcode,
             testStartDate,
             testEndDate,
             testLocation,
             testType,
             testAddress,
             reportPdfUrl,
             bizLicenseUrl,
             consultation,
             testProduct,
             testPurpose,
             testMethod,
             extra
        };

        // Add optional finance fields if they are explicitly provided in req.body
        if (estFees !== undefined) updatedData.estFees = estFees;
        if (advAmt !== undefined) updatedData.advAmt = advAmt;
        if (advDate !== undefined) updatedData.advDate = advDate;
        if (interimAmt !== undefined) updatedData.interimAmt = interimAmt;
        if (interimDate !== undefined) updatedData.interimDate = interimDate;
        if (finalAmt !== undefined) updatedData.finalAmt = finalAmt;
        if (finalDate !== undefined) updatedData.finalDate = finalDate;
        
        if (advPaidAmt !== undefined) updatedData.advPaidAmt = advPaidAmt;
        if (advPaidDate !== undefined) updatedData.advPaidDate = advPaidDate;
        if (interimPaidAmt !== undefined) updatedData.interimPaidAmt = interimPaidAmt;
        if (interimPaidDate !== undefined) updatedData.interimPaidDate = interimPaidDate;
        if (finalPaidAmt !== undefined) updatedData.finalPaidAmt = finalPaidAmt;
        if (finalPaidDate !== undefined) updatedData.finalPaidDate = finalPaidDate;
        if (isDepositCompleted !== undefined) updatedData.isDepositCompleted = isDepositCompleted;
        
        if (status) {
          updatedData.status = status;
        } else if (testerId && sample.status === 'RECEIVED') {
          // 신규 배정 시 자동으로 '시험배정(ASSIGNED)' 상태로 승격
          updatedData.status = 'ASSIGNED';
        }

        const updatedSample = await prisma.sample.update({
          where: { id },
          data: updatedData,
          select: { id: true, barcode: true, clientId: true, status: true }
        });

        // 결재 일정 변경 이력 로깅 (금액 및 날짜 변경 시)
        const finChanges = [];
        if (advAmt !== undefined && advAmt !== sample.advAmt) finChanges.push(`착수금액: ${sample.advAmt || 0} -> ${advAmt}`);
        if (advDate !== undefined && advDate !== sample.advDate) finChanges.push(`착수일자: ${sample.advDate || '-'} -> ${advDate}`);
        if (interimAmt !== undefined && interimAmt !== sample.interimAmt) finChanges.push(`중도금액: ${sample.interimAmt || 0} -> ${interimAmt}`);
        if (interimDate !== undefined && interimDate !== sample.interimDate) finChanges.push(`중도일자: ${sample.interimDate || '-'} -> ${interimDate}`);
        if (finalAmt !== undefined && finalAmt !== sample.finalAmt) finChanges.push(`잔금금액: ${sample.finalAmt || 0} -> ${finalAmt}`);
        if (finalDate !== undefined && finalDate !== sample.finalDate) finChanges.push(`잔금일자: ${sample.finalDate || '-'} -> ${finalDate}`);

        if (finChanges.length > 0 && testerId) {
          await prisma.auditLog.create({
            data: {
              tableName: 'Sample',
              recordId: id,
              action: 'PAYMENT_SCHEDULE_UPDATE',
              newValue: finChanges.join(', '),
              changedById: testerId,
              reason: '테스터 일정 변경'
            }
          });
        }

        // Create or update Test record for the assignment
        if (testerId) {
          // Check if test record already exists
          const existingTest = await prisma.test.findFirst({
            where: { sampleId: id }
          });

          if (existingTest) {
            await prisma.test.update({
              where: { id: existingTest.id },
              data: { testerId }
            });
          } else {
            // Find any equipment to satisfy the mandatory equipmentId field
            let equipment = await prisma.equipment.findFirst();
            
            // If no equipment exists, create a default one
            if (!equipment) {
              equipment = await prisma.equipment.create({
                data: {
                  name: '기본 시험 장비',
                  status: 'AVAILABLE',
                  lastCalibration: new Date(),
                  nextCalibration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
              });
            }

            await prisma.test.create({
              data: {
                sampleId: id,
                testerId,
                equipmentId: equipment.id,
                startTime: new Date(),
                status: 'IN_PROGRESS'
              }
            });
          }

          // [Notification Fix] Always create notification for the assigned tester
          // Include company name (clientId) as requested
          await prisma.notification.create({
            data: {
              userId: testerId,
              message: `[시험 배정] ${updatedSample.clientId} 기업의 새로운 시험 업무가 배정되었습니다. (접수번호: ${updatedSample.barcode})`,
            }
          });
        }

        const { reportPdfUrl: _, ...safeResponse } = updatedSample;
        return res.status(200).json(safeResponse);
      } catch (error) {
        return res.status(500).json({ message: '배정 중 오류 발생', error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};