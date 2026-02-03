import { ref, computed, shallowRef, watch, defineAsyncComponent, h, nextTick, defineComponent } from 'vue';
import axios from 'axios';
import { usePage, router } from '@inertiajs/vue3';

const resolveCallback = ref();

var resolver = {
  setResolveCallback: (callback) => {
    resolveCallback.value = callback;
  },
  resolve: (name) => resolveCallback.value(name),
};

/**
 * Reuse current props and component for the modal backdrop
 */
function preserveBackdrop (app) {
  axios.interceptors.response.use(function(response) {

    if (response.headers['x-inertia-modal']) {
      // Access full page via $page global (includes scrollProps, mergeProps, etc.)
      const currentPage = app.config.globalProperties.$page;


      response.data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

      // Preserve component and props from backdrop
      response.data.component = currentPage.component;
      response.data.props = {
        ...JSON.parse(JSON.stringify(currentPage.props)),
        ...response.data.props
      };

      // Preserve scrollProps (required for InfiniteScroll)
      if (currentPage.scrollProps) {
        response.data.scrollProps = {
          ...JSON.parse(JSON.stringify(currentPage.scrollProps)),
          ...(response.data.scrollProps || {})
        };
      }

      // Preserve other merge-related properties for partial reloads
      const preserveKeys = ['mergeProps', 'prependProps', 'deepMergeProps', 'matchPropsOn'];
      for (const key of preserveKeys) {
        if (currentPage[key]) {
          response.data[key] = {
            ...currentPage[key],
            ...(response.data[key] || {})
          };
        }
      }

      response.headers['x-inertia'] = true;
    }

    return response
  });
}

const plugin = {
  install(app, options) {
    resolver.setResolveCallback(options.resolve);

    preserveBackdrop(app);
  },
};

const page = usePage();
const modal = computed(() => page?.props?.modal);
const props = computed(() => modal.value?.props);
const key = computed(() => modal.value?.key);

const componentName = ref();
const component = shallowRef();
const show = ref(false);
const vnode = ref();

if (typeof document !== 'undefined') {
  router.on('before', (event) => {
    event.detail.visit.headers['X-Inertia-Modal-Key'] = key.value;
    event.detail.visit.headers['X-Inertia-Modal-Redirect'] = modal.value?.redirectURL;
  });
}

const close = () => {
  show.value = false;
};

const resolveComponent = () => {
  if (!modal.value?.component) {
    return close()
  }

  if (componentName.value !== modal.value?.component) {
    componentName.value = modal.value.component;

    if (componentName.value) {
      component.value = defineAsyncComponent(() => resolver.resolve(componentName.value));
    } else {
      component.value = false;
    }
  }

  vnode.value = component.value
    ? h(component.value, {
      key: key.value,
      ...props.value,
    })
    : '';

  nextTick(() => (show.value = true));
};

watch(modal, resolveComponent, {
    deep: true,
    immediate: true,
});

/**
 * @param {import('@inertiajs/core').VisitOptions} options
 */
const redirect = (options = {}) => {
  const redirectURL = modal.value?.redirectURL;

  vnode.value = false;

  if (!redirectURL) {
    return
  }

  return router.visit(redirectURL, options)
};

const useModal = () => {
  return {
    show,
    vnode,
    close,
    redirect,
    props,
  }
};

const Modal = defineComponent({
  setup() {
    const { vnode } = useModal();

    return () => vnode.value
  },
});

export { Modal, plugin as modal, useModal };
