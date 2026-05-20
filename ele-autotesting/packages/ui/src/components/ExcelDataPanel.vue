<template>
  <div class="ds-ms-panel">
    <div class="ds-ms-toolbar">
      <span class="ds-ms-toolbar-title">Excel 源数据 (mock)</span>
      <span class="ds-ms-toolbar-meta">{{ cases.length }} 条</span>
    </div>
    <div class="ds-ms-table-wrap">
      <table class="ds-ms-table">
        <thead>
          <tr>
            <th style="width: 56px">#</th>
            <th style="width: 28%">名称</th>
            <th style="width: 18%">模块</th>
            <th style="width: 72px">优先级</th>
            <th>步骤</th>
            <th style="width: 22%">期望</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in cases" :key="row.id">
            <td>{{ row.num }}</td>
            <td>
              <div class="ds-ms-case-name">{{ row.name }}</div>
              <div v-if="row.tags?.length" class="ds-ms-tags">
                <span v-for="t in row.tags" :key="t" class="ds-ms-tag">{{ t }}</span>
              </div>
            </td>
            <td>{{ row.module }}</td>
            <td>
              <span class="ds-ms-prio" :class="`ds-ms-prio--${row.priority.toLowerCase()}`">{{ row.priority }}</span>
            </td>
            <td>
              <pre class="ds-ms-pre">{{ row.steps }}</pre>
            </td>
            <td>{{ row.expected }}</td>
          </tr>
          <tr v-if="!cases.length">
            <td colspan="6" class="ds-ms-empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MOCK_EXCEL_CASES, type ExcelCaseRow } from './_mock/excel-cases'

const cases: ExcelCaseRow[] = MOCK_EXCEL_CASES
</script>
