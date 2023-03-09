<!-- <script>
    import { onMount } from 'svelte';

    let video;
    let videoContainer;

    onMount(() => {
        video = document.getElementById('video');
        window.addEventListener('scroll', () => {
            let frameNumber = window.pageYOffset / 1000; 
            video.currentTime = frameNumber;
        });      
        
        videoContainer = document.getElementById('dogtag');
        
        window.addEventListener('scroll', () => {

            let frameNumber = window.pageYOffset / 1000;

            if (frameNumber > 0.5) {
                videoContainer.style.backgroundColor = '#fff';
            } if (frameNumber < 0.5) {
                videoContainer.style.backgroundColor = 'red';
            }
            
        });


    });    
</script>

<section id="dogtag">
  <div class="dog-wrapper">
  <div class="dogtag-text">
    <h1>When you're lost in the darkness</h1>
    <h1>look for the light</h1>
  </div>

  <video id="video">
      <source src="img/dogtag.mp4" type="video/mp4">
  </video>
</div>
</section>

<section>
  <h1>TEST</h1>
  <h1>TEST</h1>
</section>

<style>
  #dogtag {
    height: 150vh;
    width: 100vw;
    background-color: #000;
  }
  #dogtag h1 {
    color: #fff;
    font-size: 3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
    text-align: center;
  }
  #dogtag video {
    width: 100%;
    max-width: 500px;
    margin-top: 2rem;
  }

  .dog-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;

  }

</style> -->