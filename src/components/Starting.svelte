<script>

</script>

<section id="start"> 
    <div class="background">
    </div>
</section>

<!-- <audio controls id="audio">
  <source src="./img/background-music.mp3" type="audio/mpeg">
</audio> -->


<style>
    #start .background {
        height: 100vh;
        width: 100vw;
        background-image: url('../img/background.png');
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        animation: fadeIn 8s;
        -webkit-animation: fadeIn 8s;
        -moz-animation: fadeIn 8s;
        -o-animation: fadeIn 8s;
        -ms-animation: fadeIn 8s;
        background-color: black;
    }

    #audio {
        position: absolute;
        top: 2%;
        right: 2%;
    }

    @keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-moz-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-webkit-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-o-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@-ms-keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>