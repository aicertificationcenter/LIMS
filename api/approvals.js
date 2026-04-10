import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { id, actionType, isApproved, rejectionReason } = req.body;
    // actionType: 'GAPJI' or 'EULJI'
    
    // Validate inputs
    if (!id || !actionType) {
      return res.status(400).json({ message: '필수 파라미터가 누락되었습니다.' });
    }

    const sample = await prisma.sample.findUnique({ 
      where: { id },
      include: {
        tests: {
          include: { tester: true }
        }
      }
    });

    if (!sample) {
      return res.status(404).json({ message: '접수 건을 찾을 수 없습니다.' });
    }

    const testerId = sample.tests?.[0]?.testerId;

    let updateData = {};
    let notificationMessage = '';
    
    if (isApproved) {
      // APPROVE LOGIC
      if (actionType === 'GAPJI') {
        updateData.gapjiApproved = true;
        updateData.gapjiRejection = null;
        notificationMessage = `[결재 완료] ${sample.barcode} 접수 건의 갑지가 승인되었습니다.`;
      } else if (actionType === 'EULJI') {
        updateData.euljiApproved = true;
        updateData.euljiRejection = null;
        notificationMessage = `[결재 완료] ${sample.barcode} 접수 건의 을지가 승인되었습니다.`;
      }

      // Check if both are approved to set formal status and barcode
      const willGapjiBeApproved = actionType === 'GAPJI' ? true : sample.gapjiApproved;
      const willEuljiBeApproved = actionType === 'EULJI' ? true : sample.euljiApproved;

      if (willGapjiBeApproved && willEuljiBeApproved && sample.status !== 'APPROVED' && sample.status !== 'COMPLETED') {
        updateData.status = 'APPROVED';
        notificationMessage = `[최종 결재 완료] ${sample.barcode} 접수 건이 모두 승인되어 정식 성적서 번호가 발급되었습니다.`;

        // Barcode Generation logic sequence
        if (!sample.formalBarcode) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const prefix = sample.testType === 'KOLAS 시험' ? `KAIC-${yyyy}-K` : `KAIC-${yyyy}-T`;
          
          const count = await prisma.sample.count({
            where: { formalBarcode: { startsWith: prefix } }
          });
          
          const seq = String(count + 1).padStart(3, '0');
          updateData.formalBarcode = `${prefix}${seq}-0`; // -0 is for revision count
        }
      }

    } else {
      // REJECT LOGIC
      if (actionType === 'GAPJI') {
        updateData.gapjiApproved = false;
        updateData.gapjiRejection = rejectionReason;
        notificationMessage = `[갑지 반려] ${sample.barcode} 접수 건의 갑지가 반려되었습니다. 사유를 확인해주세요.`;
      } else if (actionType === 'EULJI') {
        updateData.euljiApproved = false;
        updateData.euljiRejection = rejectionReason;
        notificationMessage = `[을지 반려] ${sample.barcode} 접수 건의 을지가 반려되었습니다. 사유를 확인해주세요.`;
      }
      updateData.status = 'REVISING';
    }

    const updatedSample = await prisma.sample.update({
      where: { id },
      data: updateData
    });

    if (testerId) {
      await prisma.notification.create({
        data: {
          userId: testerId,
          message: notificationMessage,
        }
      });
    }

    return res.status(200).json(updatedSample);
  } catch (error) {
    console.error('Approval Error:', error);
    return res.status(500).json({ message: '결재 처리 중 오류 발생', error: error.message });
  }
}
