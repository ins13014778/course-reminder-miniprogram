import { ElMessageBox } from 'element-plus'
import { highRiskApi } from '../api'

export async function resolveHighRiskConfirmation(payload: {
  actionKey: string
  targetType: string
  targetIds: Array<number | string>
  summary?: string
}) {
  const challengeResponse = await highRiskApi.createChallenge(payload)
  const challenge = challengeResponse.data || {}

  const promptResult = await ElMessageBox.prompt(
    `这是高风险操作。\n验证码：${challenge.confirmationCode}\n请输入上方验证码后继续。`,
    '高风险操作确认',
    {
      confirmButtonText: '确认继续',
      cancelButtonText: '取消',
      inputPlaceholder: '输入验证码',
      inputValidator: (value) => {
        if (!String(value || '').trim()) {
          return '请输入验证码'
        }
        return true
      },
    },
  )

  return {
    confirmationId: challenge.confirmationId,
    confirmationCode: String(promptResult.value || '').trim(),
  }
}
