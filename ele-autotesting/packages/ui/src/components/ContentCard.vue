<template>
  <div class="flex flex-col lg:h-full lg:max-h-screen lg:overflow-hidden">
    <div class="theme-card !p-0 flex flex-col lg:h-full lg:max-h-full lg:overflow-hidden">
      <div class="flex flex-col lg:flex-1 lg:min-h-0">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
