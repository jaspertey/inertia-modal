import axios from 'axios'

/**
 * Reuse current props and component for the modal backdrop
 */
export default function (app) {
  axios.interceptors.response.use(function(response) {

    if (response.headers['x-inertia-modal']) {
      // Access full page via $page global (includes scrollProps, mergeProps, etc.)
      const currentPage = app.config.globalProperties.$page


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

      response.headers['x-inertia'] = true
    }

    return response
  })
}
