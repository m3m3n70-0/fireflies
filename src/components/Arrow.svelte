<script>

</script>

<div class="arrow">
    <img src="img/arrow.png" alt="arrow">
</div>

<style>
    .arrow img {
        position: fixed;
        bottom: 2.5%;
        right: 0;
        width: 5%;
        z-index: 100;
        -moz-animation: bounce 2s infinite;
        -webkit-animation: bounce 2s infinite;
        animation: bounce 2s infinite;
    }

    @keyframes bounce {0%,100%,20%,50%,80% {
    -webkit-transform: translateY(0);
    -ms-transform: translateY(0);
    transform: translateY(0);
  }
  40% {
    -webkit-transform: translateY(-10px);
    -ms-transform: translateY(-10px);
    transform: translateY(-10px);
  }
  60% {
    -webkit-transform: translateY(-5px);
    -ms-transform: translateY(-5px);
    transform: translateY(-5px);
  }
}

</style>