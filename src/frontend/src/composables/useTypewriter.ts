import { ref, computed } from 'vue';

export interface TypewriterOptions {
  speed?: number;
  delay?: number;
  cursor?: boolean;
}

export function useTypewriter(text: string, options: TypewriterOptions = {}) {
  const { speed = 30, delay = 0, cursor = true } = options;
  
  const displayText = ref('');
  const isTyping = ref(false);
  const isComplete = ref(false);
  const showCursor = ref(cursor);
  
  let animationId: number | null = null;
  let currentIndex = 0;
  let startTime: number | null = null;
  
  function start() {
    if (animationId) return;
    
    isTyping.value = true;
    isComplete.value = false;
    displayText.value = '';
    currentIndex = 0;
    
    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      if (elapsed < delay) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      
      const typeElapsed = elapsed - delay;
      const charsToShow = Math.floor(typeElapsed / speed);
      
      if (charsToShow > currentIndex && currentIndex < text.length) {
        currentIndex = Math.min(charsToShow, text.length);
        displayText.value = text.slice(0, currentIndex);
      }
      
      if (currentIndex >= text.length) {
        isTyping.value = false;
        isComplete.value = true;
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        // 3秒后隐藏光标
        setTimeout(() => {
          showCursor.value = false;
        }, 3000);
        return;
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
  }
  
  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isTyping.value = false;
    displayText.value = text;
    isComplete.value = true;
    showCursor.value = false;
  }
  
  function reset() {
    stop();
    displayText.value = '';
    isComplete.value = false;
    showCursor.value = cursor;
    startTime = null;
    currentIndex = 0;
  }
  
  const cursorClass = computed(() => ({
    'typewriter-cursor': showCursor.value,
    'cursor-blink': !isTyping.value && showCursor.value,
  }));
  
  return {
    displayText: computed(() => displayText.value),
    isTyping: computed(() => isTyping.value),
    isComplete: computed(() => isComplete.value),
    showCursor: computed(() => showCursor.value),
    cursorClass,
    start,
    stop,
    reset,
  };
}

// 管理多个typewriter实例
export function useTypewriterManager() {
  const instances = new Map<string, ReturnType<typeof useTypewriter>>();
  
  function create(id: string, text: string, options?: TypewriterOptions) {
    const instance = useTypewriter(text, options);
    instances.set(id, instance);
    return instance;
  }
  
  function get(id: string) {
    return instances.get(id);
  }
  
  function remove(id: string) {
    const instance = instances.get(id);
    if (instance) {
      instance.stop();
      instances.delete(id);
    }
  }
  
  function clearAll() {
    instances.forEach((instance) => instance.stop());
    instances.clear();
  }
  
  return {
    create,
    get,
    remove,
    clearAll,
  };
}
