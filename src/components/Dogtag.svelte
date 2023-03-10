<script>

</script>


<section id="dogtag">
  <div class="dog-wrapper">
  <div class="dogtag-text">
    <h1>When you're lost in the darkness</h1>
    <h1 id="porp">look for the light</h1>
  </div>

  <video autoplay muted loop id="video">
      <source src="img/dogtag-loop.mp4" type="video/mp4">
  </video>
  
</div>
</section>


<style>
  #porp{
    color: #fff;
    text-shadow: 0 0 5px #e9b70b, 0 0 10px #e9b70b, 0 0 20px #e9b70b, 0 0 40px #e9b70b;
  }
  #dogtag {
    height: 100vh;
    width: 100vw;
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
</style>