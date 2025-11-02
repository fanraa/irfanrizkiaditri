// js/realtime.js
// Supabase realtime subscriptions to broadcast DB changes to the UI.
// - Listens to postgres_changes on key tables (profile, posts, comments, reviews, manual_news, site_data)
// - Calls local renderer functions (applyProfile, renderPosts, renderSiteComments, renderReviews, renderNews)
// - Flashes a small top-right "Live" badge when updates arrive so visitors notice live updates.
// - Safe guards in case sb (Supabase client) is not available yet; waits for 'supabaseReady' event.

(function () {
  // Small helper to find and flash live badge
  function flashLiveBadge() {
    try {
      let badge = document.getElementById('liveBadge');
      if (!badge) {
        // create on demand (in case index.html wasn't updated)
        badge = document.createElement('div');
        badge.id = 'liveBadge';
        badge.className = 'live-badge';
        badge.setAttribute('aria-hidden', 'true');
        // place into header top-actions if present, else body
        const topActions = document.querySelector('.top-actions') || document.body;
        topActions.appendChild(badge);
      }
      badge.classList.add('live-badge--active');
      // remove after short interval
      clearTimeout(badge._liveTimeout);
      badge._liveTimeout = setTimeout(() => {
        badge.classList.remove('live-badge--active');
      }, 1200);
    } catch (e) {
      // non-fatal
      console.warn('flashLiveBadge error', e);
    }
  }

  // Helper to attempt call of a renderer function if available
  function tryCall(fnName, ...args) {
    try {
      const fn = window[fnName];
      if (typeof fn === 'function') {
        return fn(...args);
      }
    } catch (e) {
      console.warn(`tryCall ${fnName} error`, e);
    }
  }

  function safeDispatch(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (e) {
      console.warn('safeDispatch error', e);
    }
  }

  async function setupRealtime() {
    if (!window.sb || typeof sb.channel !== 'function') {
      console.warn('Supabase realtime not available (sb not ready or older client).');
      return;
    }

    const subscriptions = [
      {
        table: 'profile',
        handler: (payload) => {
          console.info('[realtime] profile change', payload);
          tryCall('applyProfile');
          safeDispatch('profileChanged', payload);
          flashLiveBadge();
        }
      },
      {
        table: 'posts',
        handler: (payload) => {
          console.info('[realtime] posts change', payload);
          tryCall('renderPosts');
          safeDispatch('postsChanged', payload);
          flashLiveBadge();
        }
      },
      {
        table: 'comments',
        handler: (payload) => {
          console.info('[realtime] comments change', payload);
          tryCall('renderSiteComments');
          safeDispatch('commentsChanged', payload);
          flashLiveBadge();
        }
      },
      {
        table: 'reviews',
        handler: (payload) => {
          console.info('[realtime] reviews change', payload);
          tryCall('renderReviews');
          safeDispatch('reviewsChanged', payload);
          flashLiveBadge();
        }
      },
      {
        table: 'manual_news',
        handler: (payload) => {
          console.info('[realtime] manual_news change', payload);
          tryCall('renderNews');
          safeDispatch('newsChanged', payload);
          flashLiveBadge();
        }
      },
      {
        table: 'site_data',
        handler: (payload) => {
          console.info('[realtime] site_data change', payload);
          // site_data may carry visitors and other values
          try {
            const newVal = payload?.new?.value ?? null;
            if (newVal) {
              let parsed = null;
              if (typeof newVal === 'string') {
                try { parsed = JSON.parse(newVal); } catch (e) { parsed = null; }
              } else parsed = newVal;
              if (parsed && parsed.count !== undefined) {
                try { localStorage.setItem('visitors_count_v2', String(parsed.count)); } catch (e) {}
                const vEl = document.getElementById('visitorSmall');
                if (vEl) vEl.textContent = 'Visitors: ' + parsed.count;
              }
            }
          } catch (e) { console.warn('site_data handler error', e); }
          safeDispatch('siteDataChanged', payload);
          flashLiveBadge();
        }
      }
    ];

    // Create channel and subscribe per table
    subscriptions.forEach(sub => {
      try {
        const chan = sb.channel('realtime-' + sub.table)
          .on('postgres_changes', { event: '*', schema: 'public', table: sub.table }, (payload) => {
            try {
              sub.handler(payload);
            } catch (e) {
              console.error('realtime handler error for', sub.table, e);
            }
          });

        chan.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.info('[realtime] subscribed to', sub.table);
          }
          if (status === 'ERROR') {
            console.warn('[realtime] subscription error for', sub.table);
          }
        });

        if (!window._realtimeChannels) window._realtimeChannels = [];
        window._realtimeChannels.push(chan);
      } catch (e) {
        console.warn('Failed to setup realtime for', sub.table, e);
      }
    });

    // Optional generic listener (debug)
    try {
      const generic = sb.channel('realtime-public-all')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          // debug only
          console.debug('[realtime] public change', payload.table, payload.eventType);
        })
        .subscribe();
      window._realtimeChannels.push(generic);
    } catch (e) {
      // ignore
    }
  }

  // Wait for supabaseReady
  if (document.readyState === 'loading') {
    document.addEventListener('supabaseReady', setupRealtime);
  } else {
    if (window.sb) setupRealtime();
    else document.addEventListener('supabaseReady', setupRealtime);
  }

  // cleanup
  window.addEventListener('beforeunload', () => {
    try {
      if (window._realtimeChannels && Array.isArray(window._realtimeChannels)) {
        window._realtimeChannels.forEach(ch => {
          try { ch.unsubscribe(); } catch (e) {}
        });
        window._realtimeChannels = [];
      }
    } catch (e) {}
  });

})();