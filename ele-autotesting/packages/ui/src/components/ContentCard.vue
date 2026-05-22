<template>
  <div class="ds-content-card-shell flex flex-col h-full max-h-screen overflow-hidden">
    <div class="ds-content-card-inner theme-card !p-0 flex flex-col h-full sm:min-h-[440px] max-h-full overflow-hidden">
      <div class="flex flex-col flex-1 min-h-0">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
