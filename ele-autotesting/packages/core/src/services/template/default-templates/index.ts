/**
 * 默认模板统一导入
 */

import { template as testcase_generator } from './optimize/testcase-generator'
import { template as eye_analysis } from './optimize/eye-analysis'
import { template as prd_generate } from './optimize/prd-generate'

import { template as content_fine_tuning } from './iterate/content_fine_tuning'
import { template as prd_optimize } from './iterate/prd-optimize'
import { template as only_return } from './iterate/only_return'
import { template as prompt_generate } from './iterate/prompt-generate'
import { template as prompt_optimize } from './iterate/prompt-optimize'

import { user_prompt_basic } from './user-optimize/user-prompt-basic'

export const ALL_TEMPLATES = {
  testcase_generator,
  eye_analysis,
  prd_generate,
  content_fine_tuning,
  prd_optimize,
  user_prompt_basic,
  only_return,
  prompt_generate,
  prompt_optimize,
}
