<script>

</script>

<section id="contact">
    <div class="contact-container">
        <div class="col1">
            <div class="col-wrapper">
                <form>
                    <input type = "text" name = "first" placeholder="First Name">
                    <input type = "text" name = "last" placeholder="Last Name">
                    <input type = "text" name = "email" placeholder="Email">
                    <input type="date" name="birth" placeholder="Date Of Birth">

                </form>
                <a href="#">Send</a>
            </div>
        </div>
        <div class="col2">
            <div class="col-wrapper">
                <h1>How To Join Us</h1>
                <p>If you’re ready to join a cause that is greater than yourself, and if you believe that humanity can rise above even the most dire of circumstances, then the Fireflies are waiting for you. </p>
            </div>
        </div>
    </div>
</section>
<style>
    #contact {
        height: 100vh;
        width: 100vw;
    }

    #contact .contact-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }

    #contact .col1, #contact .col2 {
        height: 100%;
        width: 50%;
    }

    #contact .col-wrapper{
        padding: 10%;
        padding-top: 20%;
    }

    #contact h1{
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 2rem;
        text-align: center;
    }

    #contact form{
        display: flex;
        flex-direction: column;
    }

    #contact form input{
        margin-bottom: 2rem;
        border: none;
        border-bottom: 1px solid #fff;
        background-color: transparent;
        font-size: 1.5rem;
        color: #fff;
        padding: 0.5rem;
    }

    #contact form input::placeholder{
        color: #fff;
        font-size: 1.5rem;
    }

    #contact form input:focus{
        outline: none;
    }

    #contact a{
        font-size: 16px;
        color: #fff;
        border: 2px solid #fff;
        max-width: 200px;
        width: 100%;
        text-align: center;
        height: 45px;
        line-height: 47px;
        display: inline-block;
        transition: all 0.5s;
        -webkit-transition: all 0.5s;
        cursor: pointer;
    }


</style>