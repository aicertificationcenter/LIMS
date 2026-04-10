import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const samples = await prisma.sample.findMany({
          orderBy: { receivedAt: 'desc' },
          include: {
            invoice: {
              include: { items: true }
            },
            tests: {
              include: {
                tester: true
              }
            }
          }
        });
        const mappedSamples = samples.map(s => ({
          ...s,
          reportPdfUrl: s.reportPdfUrl ? `/api/report-pdf?id=${s.id}` : null
        }));
        return res.status(200).json(mappedSamples);
      } catch (error) {
        return res.status(500).json({ message: '리스트 조회 중 오류 발생', error: error.message });
      }

    case 'POST':
      try {
        const { client, clientName, phone, email, bizNo, target, extra } = req.body;
        
        // barcode 생성 logic (YYYYMMDD-seq)
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.sample.count({
          where: { barcode: { startsWith: `KAIC_${dateStr}` } }
        });
        const seq = String(count + 1).padStart(3, '0');
        const barcode = `KAIC_${dateStr}_${seq}`;

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
          }
        });
        return res.status(201).json(newSample);
      } catch (error) {
        return res.status(500).json({ message: '등록 중 오류 발생', error: error.message });
      }

    case 'PATCH':
      try {
        const { id, testerId, status, testStartDate, testEndDate, testLocation, testType, testAddress, reportPdfUrl, consultation, testProduct, testPurpose, testMethod, extra } = req.body;
        
        // Update sample status and generate testerBarcode if needed
        const sample = await prisma.sample.findUnique({ where: { id } });
        let testerBarcode = sample.testerBarcode;

        if (testerId && !testerBarcode) {
          const user = await prisma.user.findUnique({ where: { id: testerId } });
          if (user) {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const datePrefix = `${yy}${mm}${dd}`;
            
            const baseId = `${user.id}_${datePrefix}`;
            const count = await prisma.sample.count({
              where: { testerBarcode: { startsWith: baseId } }
            });
            const seq = String(count + 1).padStart(3, '0');
            testerBarcode = `${baseId}_${seq}`;
          } else {
            console.error(`[API Error] User not found during testerBarcode generation: ${testerId}`);
          }
        }

        const updatedSample = await prisma.sample.update({
          where: { id },
          data: { 
             status: status || 'ASSIGNED',
             testerBarcode,
             testStartDate,
             testEndDate,
             testLocation,
             testType,
             testAddress,
             reportPdfUrl,
             consultation,
             testProduct,
             testPurpose,
             testMethod,
             extra
          }
        });

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

        return res.status(200).json(updatedSample);
      } catch (error) {
        return res.status(500).json({ message: '배정 중 오류 발생', error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
