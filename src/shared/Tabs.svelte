    <script>
        import { createEventDispatcher } from 'svelte';
        let dispatch = createEventDispatcher();
        
        export let items;
        export let activeItem;
      </script>
      
        <ul class="nav-bottom">
          {#each items as item}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <li on:click={() => dispatch('tabChange', item)}>
              <a class:selected={item === activeItem}>{ item }</a>
            </li>
          {/each}
        </ul>

<style>

</style>
