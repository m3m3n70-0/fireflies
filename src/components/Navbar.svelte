<script>
    import Tabs from '../shared/Tabs.svelte';
    import HomeSec from './Home-sec.svelte';
    import DocentenSec from './Docenten-sec.svelte';
    import PrijzenSec from './Prijzen-sec.svelte';
	
	// tabs
	let items = ['Home', 'Docenten', 'Zanglessen', 'Prijzen', 'Contact'];
  	let activeItem = 'Home';
  	const tabChange = (e) => activeItem = e.detail;
</script>

<nav>
    <div class="top-nav">
        <img src="img/logo.png" alt="Zangschool De Nachtegaal">
        <h1>Zangschool De Nachtegaal</h1>
    </div>
    <Tabs {activeItem} {items} on:tabChange={tabChange} />  
</nav>	

  {#if activeItem === 'Home'}
    <HomeSec />
  {:else if activeItem === 'Docenten'}
    <DocentenSec />
	  {:else if activeItem === 'Zanglessen'}
	<h1>Zanglessen</h1>
	  {:else if activeItem === 'Prijzen'}
    <PrijzenSec />
	  {:else if activeItem === 'Contact'}
	<h1>Contact</h1>
	
  {/if}

<style>
	
</style>